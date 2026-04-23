function $(str) {
  return document.getElementById(str);
}


let firstNameField;
let lastNameField;
let emailField;
let phoneField;
let birthdateField;
let id = null;

let formMode = "create";

const BUTTON_BASE_CLASSES =
  "w-full rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out";

const BUTTON_ENABLED_CLASSES =
  "bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft";

const BUTTON_DISABLED_CLASSES =
  "cursor-not-allowed opacity-50";

async function loadCustomers() {
  const container = document.getElementById("customer-list");

  try {
    const res = await fetch("/api/persons");

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await res.json();

    // Clear placeholder
    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p>No customers found.</p>";
      return;
    }

    // Create simple list
    data.forEach(person => {
      const div = document.createElement("div");
      div.className = "customer-card primary";

      div.innerHTML = `
        <strong>${person.first_name} ${person.last_name}</strong><br>
        Email: ${person.email}<br>
        Phone: ${person.phone || "-"}
      `;

      div.addEventListener("click", () => {
        firstNameField.value = person.first_name;
        lastNameField.value = person.last_name;
        emailField.value = person.email;
        phoneField.value = person.phone;
        birthdateField.valueAsDate = new Date(person.birth_date);
        id = person.id;
        console.log(`Loaded id: ${id}`);
        formMode = "edit";
        console.log(person.birth_date)
        renderActionButtons();
      });

      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p style='color:red;'>Error loading data</p>";
  }
}

function addTextField(id, placeholder) {
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = "text";
  input.placeholder = placeholder;
  return input;
}

function addTelField(id, placeholder) {
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = "tel";
  input.placeholder = placeholder;
  return input;
}

function addDateField(id) {
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = "date";
  return input;
}

function loadFormFields() {
  $("customerFirstNameCnt").appendChild(firstNameField = addTextField("customer-first-name", "Enter first name"));
  $("customerLastNameCnt").appendChild(lastNameField = addTextField("customer-last-name", "Enter last name"));
  $("customerPhoneCnt").appendChild(phoneField = addTelField("customer-phone", "Enter phone number"));
  $("customerEmailCnt").appendChild(emailField = addTextField("customer-email", "Enter email"));
  $("customerBirthdateCnt").appendChild(birthdateField = addDateField("customer-birthdate", "Enter birthdate"));
}

// Run on page load
loadCustomers();
loadFormFields();

renderActionButtons();


//////////////////////////////////////////////////////////////////////////////

function addButton({ label, type = "button", value, classes = "" }) {
  const btn = document.createElement("button");
  btn.type = type;
  btn.textContent = label;
  btn.name = "action";
  if (value) btn.value = value;

  btn.className = `${BUTTON_BASE_CLASSES} ${classes}`.trim();

  const actions = $("customer-actions");
  actions.appendChild(btn);
  return btn;
}

function setButtonEnabled(btn, enabled) {
  if (!btn) return;

  btn.disabled = !enabled;

  // Keep disabled look in ONE place (here)
  btn.classList.toggle("cursor-not-allowed", !enabled);
  btn.classList.toggle("opacity-50", !enabled);

  // Optional: remove hover feel when disabled (recommended UX)
  if (!enabled) {
    btn.classList.remove("hover:bg-brand-dark/80");
  } else {
    // Only re-add if this button is supposed to have it
    // (for Create we know it is)
    if (btn.value === "create" || btn.textContent === "Create") {
      btn.classList.add("hover:bg-brand-dark/80");
    }
  }
}

function renderActionButtons(currentRole) {
  const actions = $("customer-actions");

  actions.innerHTML = "";
  if (formMode === "create") {
    let createButton = addButton({
      label: "Create",
      type: "submit",
      value: "create",
      classes: BUTTON_ENABLED_CLASSES,
    });

    let clearButton = addButton({
      label: "Clear",
      type: "button",
      classes: BUTTON_ENABLED_CLASSES,
    });

    setButtonEnabled(createButton, true);
    setButtonEnabled(clearButton, true);
    clearButton.addEventListener("click", clearResourceForm);
  }

  if (formMode === "edit") {
    let updateButton = addButton({
      label: "Update",
      type: "submit",
      value: "update",
      classes: BUTTON_ENABLED_CLASSES,
    });

    let deleteButton = addButton({
      label: "Delete",
      type: "submit",
      value: "delete",
      classes: BUTTON_ENABLED_CLASSES,
    });
    setButtonEnabled(updateButton, true);
    setButtonEnabled(deleteButton, true);
  }
}

function clearResourceForm() {
  firstNameField.value = "";
  lastNameField.value = "";
  phoneField.value = "";
  emailField.value = "";
  birthdateField.value = "";
  formMode = "create";
  id = null;
  renderActionButtons();
};


////////////////////////////////////////////////////////////////////

function getFormMessageEl() {
  return document.getElementById("formMessage");
}

/**
 * Show a success/error/info message in the UI.
 * type: "success" | "error" | "info"
 */
function showFormMessage(type, message) {
  const el = getFormMessageEl();
  if (!el) return;

  // Base styling
  el.className = "customer-card";
  el.classList.remove("hidden");

  // Type-specific styling (Tailwind utility classes)
  if (type === "success") {
    el.classList.add("success");
  } else if (type === "info") {
    el.classList.add("info");
  } else {
    // error (default)
    el.classList.add("error");
  }

  // Preserve line breaks
  el.textContent = message;

  // Bring message into view (nice UX after submit)
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearFormMessage() {
  const el = getFormMessageEl();
  if (!el) return;
  el.textContent = "";
  el.className = "";
}

async function readResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  // JSON is the expected format from our API
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return { ok: false, error: "Invalid JSON response" };
    }
  }

  // Fallback: read as text
  const text = await response.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Non-JSON response", raw: text };
  }
}

/**
 * Build a readable message for field validation errors returned by the API.
 * Expected format: { errors: [ { field, msg }, ... ] }
 */
function buildValidationMessage(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Validation failed. Please check your input fields.";
  }

  const lines = errors.map((e) => {
    const field = e.field || "field";
    const msg = e.msg || "Invalid value";
    return `• ${field}: ${msg}`;
  });

  return `${lines.join("\n")}`;
}

/**
 * Build a readable message for generic API errors.
 */
function buildGenericErrorMessage(status, body) {
  const details = body?.details ? `\n\nDetails: ${body.details}` : "";
  const error = body?.error ? body.error : "Request failed";
  return `Server returned an error (${status}).\n\nReason: ${error}${details}`;
}

//////////////////////////////////////////////////////////////////////////////


document.addEventListener("DOMContentLoaded", () => {
  const form = $("customer-form");
  if (!form) return;
  form.addEventListener("submit", onSubmit);
});

async function onSubmit(event) {
  console.log("submission")

  event.preventDefault();

  const submitter = event.submitter;
  const actionValue = submitter && submitter.value ? submitter.value : "create";

  const payload = {
    action: actionValue,
    first_name: firstNameField?.value ?? "",
    last_name: lastNameField?.value ?? "",
    email: emailField?.value ?? "",
    phone: phoneField?.value ?? "",
    birth_date: birthdateField?.value ?? "",
  };

  try {
    
    clearFormMessage();

    // ------------------------------
    // Decide method + URL
    // ------------------------------
    let method = "POST";
    let url = "/api/persons";
    let requestBody = null;

    console.log(formMode)
    console.log(id)

    if (actionValue === "create") {
      method = "POST";
      url = "/api/persons";
      requestBody = JSON.stringify(payload);
    } else if (actionValue === "update") {
      if (!id) {
        showFormMessage("error", "Update failed: missing resource ID. Select a resource first.");
        return;
      }
      method = "PUT";
      url = `/api/persons/${id}`;
      requestBody = JSON.stringify(payload);
    } else if (actionValue === "delete") {
      if (!id) {
        showFormMessage("error", "Delete failed: missing resource ID. Select a resource first.");
        return;
      }
      method = "DELETE";
      url = `/api/persons/${id}`;
      requestBody = null;
    } else {
      showFormMessage("error", `Unknown action: ${actionValue}`);
      return;
    }

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    // Always parse body (for both success and error cases)
    const body = await readResponseBody(response);

    // -----------------------------------------
    // Error handling by HTTP status
    // -----------------------------------------
    if (!response.ok) {
      // 400 = server-side validation errors (we expect errors[])
      if (response.status === 400) {
        const msg = buildValidationMessage(body?.errors);
        showFormMessage("info", `An error occurred while creating this resource:\n${msg}`);
        return;
      }

      // 409 = duplicate resourceName (our new feature)
      if (response.status === 409) {
        const msg =
          body?.details ||
          "A resource with the same name already exists. Please choose another name.";
        showFormMessage("info", `An error occurred while creating this resource:\n${msg}`);
        return;
      }

      // Other errors (500, 404, etc.)
      showFormMessage("error", buildGenericErrorMessage(response.status, body));
      return;
    }

    showFormMessage("success", `Successfully processed action!`);

    clearResourceForm();
    loadCustomers();
  } catch (err) {
    // Network errors, CORS issues, server unreachable, etc.
    console.error("POST error:", err);
    showFormMessage("error", "Network error: Could not reach the server. Check your environment and try again.");
  }
}