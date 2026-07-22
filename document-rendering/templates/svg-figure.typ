#let source = sys.inputs.at("source")
#let page-width = float(sys.inputs.at("width")) * 1pt
#let page-height = float(sys.inputs.at("height")) * 1pt

#set page(width: page-width, height: page-height, margin: 0pt)
#place(top + left, image(source, width: page-width, height: page-height, fit: "contain"))
