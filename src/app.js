const $ = (selector) => document.querySelector(selector);
const defaultImage = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23666a65'/><stop offset='1' stop-color='%231f2927'/></linearGradient></defs><rect fill='url(%23g)' width='100%' height='100%'/><path d='M0 1250 C260 1170 550 1310 1080 1190 V1920 H0Z' fill='%236d8786' opacity='.5'/><rect x='180' y='810' width='720' height='410' rx='10' fill='%23dbc9a4'/><rect x='130' y='700' width='820' height='130' fill='%23252e2b'/><text x='540' y='980' text-anchor='middle' fill='%23252e2b' font-size='54' font-family='sans-serif'>IL TIRATORE</text><text x='540' y='1060' text-anchor='middle' fill='%23252e2b' font-size='28' font-family='sans-serif'>UPLOAD A QUAY PHOTO</text></svg>`);

let photoUrl = defaultImage;
let selectedDirection = null;
let activeContext = null;
let activeInterpretation = null;

$("#story-image").src = defaultImage;

function readContext() {
  return {
    day: $("#day").value,
    temperatureC: Number($("#temperature").value),
    forecastC: Number($("#forecast").value),
    blockingEvents: Number($("#events").value),
    opensAt: $("#opens-at").value,
    closesAt: $("#closes-at").value,
    products: $("#products").value.split(",").map((item) => item.trim()).filter(Boolean),
  };
}

function renderChecks(context, direction, interpretation) {
  const validation = direction.validation;
  const conformance = direction.semanticConformance;
  $("#validation").innerHTML = `<h3>Deterministic validation</h3><p class="${validation.valid ? "pass" : "fail"}">${validation.valid ? "Passes: hours and flavours are present; no forbidden copy." : `Blocked: ${[...validation.missing, ...validation.violations].join(" ")}`}</p>`;
  $("#conformance").innerHTML = `<h3>Semantic conformance</h3><p class="${conformance.conforms ? "pass" : "fail"}">${conformance.conforms ? "Passes: no urgency, heat relief or seasonal cliché." : `Blocked: ${conformance.violations.join(" ")}`}</p>`;
  $("#publish").disabled = !(validation.valid && conformance.conforms);
}

function selectDirection(direction) {
  selectedDirection = direction;
  document.querySelectorAll(".direction").forEach((element) => {
    const isSelected = element.dataset.id === direction.id;
    element.classList.toggle("selected", isSelected);
    element.setAttribute("aria-checked", String(isSelected));
  });
  $("#story-caption").textContent = direction.caption;
  renderChecks(activeContext, direction, activeInterpretation);
}

function renderDirections(directions) {
  const container = $("#directions");
  container.innerHTML = "";
  directions.forEach((direction, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "direction";
    button.dataset.id = direction.id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(index === 0));
    button.innerHTML = `<span class="direction-number">0${index + 1}</span><span><strong>${direction.id.replaceAll("-", " ")}</strong><span>${direction.concept}</span><small>Nearest avoid: ${direction.nearestAvoid}</small></span>`;
    button.addEventListener("click", () => selectDirection(direction));
    container.append(button);
  });
  selectDirection(directions[0]);
}

$("#photo").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    photoUrl = reader.result;
    $("#story-image").src = photoUrl;
    $("#photo-status").textContent = `${file.name} is ready for the Story preview.`;
  };
  reader.readAsDataURL(file);
});

$("#prepare").addEventListener("click", async () => {
  const button = $("#prepare");
  button.disabled = true; button.textContent = "Reading live context…";
  try {
    const response = await fetch("/api/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(readContext()) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Preparation failed.");
    activeContext = result.context;
    $("#temperature").value = activeContext.temperatureC;
    $("#forecast").value = activeContext.forecastC;
    $("#events").value = activeContext.blockingEvents;
    $("#day").value = activeContext.day;
    $("#opening-result").textContent = result.opening.isOpen ? "Live opening decision: cart opens. AI interpretation is ready for review." : "Live opening decision: cart stays closed. No Story is prepared.";
    if (!result.opening.isOpen || result.interpretation.recommendation === "do_not_publish") { $("#review").classList.add("hidden"); return; }
    activeInterpretation = result.interpretation;
  $("#observation").textContent = activeInterpretation.observation;
  $("#relevance").textContent = activeInterpretation.organisationalRelevance;
  $("#semantic-direction").textContent = activeInterpretation.semanticDirection;
  $("#rejected-frames").textContent = activeInterpretation.rejectedFrames.join(" · ");
  $("#avoid").textContent = activeInterpretation.avoid.join(" · ");
  $("#story-image").src = photoUrl;
  renderDirections(result.directions);
  $("#decision-result").textContent = "";
  $("#review").classList.remove("hidden");
    $("#review").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { $("#opening-result").textContent = `Could not prepare the live Story: ${error.message}`; $("#review").classList.add("hidden");
  } finally { button.disabled = false; button.textContent = "Prepare review"; }
});

$("#iterate").addEventListener("click", () => { $("#decision-result").textContent = "Iteration requested. Return to the selected direction; the interpretation remains intact."; });
$("#cancel").addEventListener("click", () => { $("#decision-result").textContent = "Cancelled. The decision and its rationale are recorded as no publication."; });
$("#publish").addEventListener("click", () => { $("#decision-result").textContent = `Approved for publication: ${selectedDirection.id}. The approved Story is bound to Philosophy v1.0.0 and Skill v0.1.0.`; });
