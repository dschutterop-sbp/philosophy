-- Purely presentational Pandoc transformations for the arXiv LaTeX build.
-- The canonical Markdown remains the authoritative content source.

local reference_widths = {
  [3] = {0.18, 0.52, 0.30},
  [4] = {0.20, 0.28, 0.27, 0.25},
  [5] = {0.23, 0.28, 0.17, 0.14, 0.18},
}

function Image(image)
  if image.src:match("%.svg$") then
    image.src = image.src:gsub("%.svg$", ".pdf")
  end
  return image
end

function Table(table)
  local column_count = #table.colspecs
  local widths = reference_widths[column_count]
  if widths then
    for index, colspec in ipairs(table.colspecs) do
      colspec[1] = pandoc.AlignLeft
      colspec[2] = widths[index]
    end
  else
    for _, colspec in ipairs(table.colspecs) do
      colspec[1] = pandoc.AlignLeft
    end
  end
  if column_count == 4 then
    return {
      pandoc.RawBlock("latex", "\\Needspace{0.38\\textheight}"),
      table,
    }
  end
  return table
end

function Pandoc(document)
  local blocks = document.blocks
  local abstract_start = nil

  if blocks[1] and blocks[1].t == "Header" and blocks[1].level == 1
      and pandoc.utils.stringify(blocks[1].content) == "Abstract" then
    abstract_start = 1
  end

  if abstract_start then
    local abstract_blocks = {}
    local body_start = 2
    while body_start <= #blocks do
      local block = blocks[body_start]
      if block.t == "HorizontalRule" then
        body_start = body_start + 1
        break
      end
      if block.t == "Header" and block.level == 1 then
        break
      end
      table.insert(abstract_blocks, block)
      body_start = body_start + 1
    end
    document.meta.abstract = pandoc.MetaBlocks(abstract_blocks)
    local body = {}
    for index = body_start, #blocks do
      table.insert(body, blocks[index])
    end
    blocks = body
  end

  -- The licence metadata is rendered unobtrusively as the title footnote.
  if document.meta.rights then
    document.meta.thanks = document.meta.rights
  end

  -- Horizontal rules in the Markdown are section separators, not content.
  -- The academic hierarchy makes them unnecessary and intentionally omits them.
  local styled = {}
  local references_open = false
  for _, block in ipairs(blocks) do
    if block.t ~= "HorizontalRule" then
      table.insert(styled, block)
      if block.t == "Header" and block.identifier == "paper-references" then
        table.insert(styled, pandoc.RawBlock("latex", "\\begin{PaperReferences}"))
        references_open = true
      end
    end
  end
  if references_open then
    table.insert(styled, pandoc.RawBlock("latex", "\\end{PaperReferences}"))
  end

  document.blocks = styled
  return document
end
