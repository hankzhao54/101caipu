const appVersion = "supabase3";
const fallbackData = window.RECIPE_WIKI_DATA || { meta: {}, categories: [], recipes: [] };
const supabaseSettings = window.RECIPE_WIKI_SUPABASE;
const requireAuth = Boolean(supabaseSettings?.requireAuth);
const supabaseClient =
  window.supabase && supabaseSettings?.url && supabaseSettings?.anonKey
    ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey)
    : null;

const categoryNames = {
  Stocks: ["Stocks", "\u9ad8\u6c64"],
  Sauces: ["Sauces", "\u9171\u6c41"],
  Prep: ["Prep", "\u9884\u5904\u7406"],
  "Bakery and sweets": ["Bakery and sweets", "\u751c\u70b9\u548c\u70d8\u7119"],
  Dumplings: ["Dumplings", "\u997a\u5b50"],
  "Ferments and pickles": ["Ferments and pickles", "\u53d1\u9175\u548c\u814c\u5236"],
  Cakes: ["Cakes", "\u7cd5\u70b9"],
  Noodles: ["Noodles", "\u9762\u6761"],
  "Spices and oils": ["Spices and oils", "\u9999\u6599\u548c\u6cb9"],
  "Nuts and garnish": ["Nuts and garnish", "\u575a\u679c\u548c\u914d\u6599"],
};

const editableRoles = new Set(["owner", "manager", "kitchen", "translator"]);
const userManagerRoles = new Set(["owner", "manager"]);

const els = {
  recipeCount: document.querySelector("#recipeCount"),
  searchInput: document.querySelector("#searchInput"),
  languageSelect: document.querySelector("#languageSelect"),
  categorySelect: document.querySelector("#categorySelect"),
  statusSelect: document.querySelector("#statusSelect"),
  recipeList: document.querySelector("#recipeList"),
  sourceMeta: document.querySelector("#sourceMeta"),
  recipeTitle: document.querySelector("#recipeTitle"),
  recipeNumber: document.querySelector("#recipeNumber"),
  recipeCategory: document.querySelector("#recipeCategory"),
  recipeStatus: document.querySelector("#recipeStatus"),
  recipePages: document.querySelector("#recipePages"),
  ingredientCount: document.querySelector("#ingredientCount"),
  ingredientsList: document.querySelector("#ingredientsList"),
  ingredientsHuList: document.querySelector("#ingredientsHuList"),
  ingredientsZhList: document.querySelector("#ingredientsZhList"),
  englishText: document.querySelector("#englishText"),
  sourceText: document.querySelector("#sourceText"),
  chineseText: document.querySelector("#chineseText"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  userBadge: document.querySelector("#userBadge"),
  loginButton: document.querySelector("#loginButton"),
  manageUsersButton: document.querySelector("#manageUsersButton"),
  reviewButton: document.querySelector("#reviewButton"),
  needsReviewButton: document.querySelector("#needsReviewButton"),
  editButton: document.querySelector("#editButton"),
  exportButton: document.querySelector("#exportButton"),
  editDialog: document.querySelector("#editDialog"),
  loginDialog: document.querySelector("#loginDialog"),
  usersDialog: document.querySelector("#usersDialog"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginNote: document.querySelector("#loginNote"),
  saveLogin: document.querySelector("#saveLogin"),
  editTitleZh: document.querySelector("#editTitleZh"),
  editTitleHu: document.querySelector("#editTitleHu"),
  editTitleEn: document.querySelector("#editTitleEn"),
  editIngredients: document.querySelector("#editIngredients"),
  editIngredientsHu: document.querySelector("#editIngredientsHu"),
  editIngredientsZh: document.querySelector("#editIngredientsZh"),
  editMethod: document.querySelector("#editMethod"),
  editHungarianNotes: document.querySelector("#editHungarianNotes"),
  editChineseNotes: document.querySelector("#editChineseNotes"),
  editSummary: document.querySelector("#editSummary"),
  saveEdit: document.querySelector("#saveEdit"),
  usersList: document.querySelector("#usersList"),
  usersNote: document.querySelector("#usersNote"),
  refreshUsers: document.querySelector("#refreshUsers"),
};

let appData = {
  ...fallbackData,
  recipes: requireAuth ? [] : fallbackData.recipes || [],
  categories: requireAuth ? [] : fallbackData.categories || [],
};
let currentUser = null;
let currentProfile = null;
let selectedId = appData.recipes[0]?.id || null;
let backendReady = false;
let loadingBackend = false;

function withTimeout(promise, label, milliseconds = 12000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out. Please refresh and try again.`)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function currentRole() {
  return currentProfile?.role || "viewer";
}

function canEditRecipes() {
  return editableRoles.has(currentRole());
}

function canManageUsers() {
  return userManagerRoles.has(currentRole());
}

function currentRecipe() {
  return appData.recipes.find((item) => item.id === selectedId) || appData.recipes[0] || null;
}

function statusLabel(status) {
  if (status === "reviewed") return "Reviewed";
  if (status === "machine-translated") return "Machine translated";
  if (status === "imported") return "Imported";
  return "Needs review";
}

function cleanText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function splitLines(text) {
  return text.split(/\n/).map((line) => line.trim()).filter(Boolean);
}

function recipeTitle(recipe, language = els.languageSelect.value) {
  if (language === "zh") return recipe.titleZh || recipe.titleEn || recipe.title || "Untitled";
  if (language === "hu") return recipe.title || recipe.titleEn || "Untitled";
  return recipe.titleEn || recipe.title || "Untitled";
}

function categoryLabel(category, language = els.languageSelect.value) {
  const labels = categoryNames[category];
  if (!labels) return category || "Other";
  return language === "zh" ? labels[1] : labels[0];
}

function ingredientsForLanguage(recipe, language) {
  if (language === "zh") return recipe.ingredientsZh?.length ? recipe.ingredientsZh : [];
  if (language === "hu") return recipe.ingredients?.length ? recipe.ingredients : [];
  return recipe.ingredientsEn?.length ? recipe.ingredientsEn : recipe.ingredients || [];
}

function stepsFor(recipe, language) {
  if (language === "zh") return recipe.methodZh?.length ? recipe.methodZh : [];
  if (language === "hu") return recipe.method?.length ? recipe.method : [];
  return recipe.methodEn?.length ? recipe.methodEn : [];
}

function formatSteps(lines, emptyText) {
  const cleaned = (lines || []).map((line) => cleanText(String(line).replace(/^\d+\.\s*/, ""))).filter(Boolean);
  if (!cleaned.length) return emptyText;
  return cleaned.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

function renderArray(container, items, emptyText) {
  container.innerHTML = "";
  const values = items.length ? items : [emptyText];
  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function updateSourceMeta(message = "") {
  const source = backendReady || requireAuth ? "Supabase database" : appData.meta?.source || "Local data";
  const sourceSize = requireAuth && !backendReady
    ? "login required"
    : appData.meta?.totalPages
      ? `${appData.meta.totalPages} pages`
      : `${appData.meta?.totalParagraphs || 0} Word paragraphs`;
  els.sourceMeta.textContent = [source, backendReady ? "live" : sourceSize, appVersion, message].filter(Boolean).join(" / ");
}

function renderUser() {
  if (currentUser) {
    const label = currentProfile?.display_name || currentUser.email || "Signed in";
    els.userBadge.textContent = `${label} / ${currentRole()}`;
    els.loginButton.textContent = "Sign out";
  } else if (supabaseClient) {
    els.userBadge.textContent = backendReady ? "Guest / database connected" : "Guest / database";
    els.loginButton.textContent = "Sign in";
  } else {
    els.userBadge.textContent = "Guest / local backup";
    els.loginButton.textContent = "Sign in";
  }

  els.editButton.disabled = !canEditRecipes();
  els.editButton.title = canEditRecipes() ? "" : "Ask an owner or manager to give this user edit access.";
  const recipe = currentRecipe();
  const canReview = canEditRecipes() && Boolean(recipe?.dbId || recipe);
  els.reviewButton.disabled = !canReview || recipe?.status === "reviewed";
  els.needsReviewButton.disabled = !canReview || recipe?.status === "needs_review";
  els.manageUsersButton.hidden = !canManageUsers();
}

function renderFilters() {
  const categories = ["All", ...appData.categories];
  els.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category === "All" ? "All" : categoryLabel(category, "en")}</option>`)
    .join("");
  els.recipeCount.textContent = appData.recipes.length ? `${appData.recipes.length} recipes` : "Sign in";
  updateSourceMeta();
}

function filteredRecipes() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.categorySelect.value;
  const status = els.statusSelect.value;
  return appData.recipes.filter((recipe) => {
    const haystack = [
      recipe.number,
      recipe.title,
      recipe.titleEn,
      recipe.titleZh,
      recipe.category,
      recipe.categoryHu,
      recipe.categoryZh,
      ...(recipe.ingredients || []),
      ...(recipe.ingredientsEn || []),
      ...(recipe.ingredientsZh || []),
      ...(recipe.method || []),
      ...(recipe.methodEn || []),
      ...(recipe.methodZh || []),
    ].join(" ").toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (category === "All" || recipe.category === category) &&
      (status === "All" || recipe.status === status)
    );
  });
}

function renderList() {
  const recipes = filteredRecipes();
  if (!recipes.some((recipe) => recipe.id === selectedId)) selectedId = recipes[0]?.id || appData.recipes[0]?.id;
  if (!recipes.length) {
    els.recipeList.innerHTML = "<p class=\"login-note\">No recipes match the current filters.</p>";
    return;
  }
  els.recipeList.innerHTML = recipes.map((recipe) => `
    <button class="recipe-item ${recipe.id === selectedId ? "active" : ""}" data-id="${recipe.id}" type="button">
      <strong>${recipe.number} ${recipeTitle(recipe)}</strong>
      <span>${categoryLabel(recipe.category)} / ${statusLabel(recipe.status)}</span>
    </button>
  `).join("");
}

function renderDetail() {
  const recipe = currentRecipe();
  if (!recipe) {
    els.recipeTitle.textContent = currentUser ? "No recipe selected" : "Sign in required";
    els.recipeNumber.textContent = "-";
    els.recipeCategory.textContent = "-";
    els.recipeStatus.textContent = currentUser ? "No data" : "Locked";
    els.recipePages.textContent = "-";
    els.ingredientCount.textContent = "0 items";
    els.historyCount.textContent = "0 entries";
    renderArray(els.ingredientsList, [], currentUser ? "No ingredients loaded." : "Sign in to view ingredients.");
    renderArray(els.ingredientsHuList, [], currentUser ? "No Hungarian source loaded." : "Sign in to view Hungarian source ingredients.");
    renderArray(els.ingredientsZhList, [], currentUser ? "No Chinese translation loaded." : "Sign in to view Chinese ingredients.");
    els.englishText.textContent = currentUser ? "No steps loaded." : "Sign in to view steps.";
    els.sourceText.textContent = currentUser ? "No steps loaded." : "Sign in to view steps.";
    els.chineseText.textContent = currentUser ? "No steps loaded." : "Sign in to view steps.";
    els.historyList.innerHTML = "<p class=\"login-note\">No changes recorded yet.</p>";
    return;
  }

  const ingredients = ingredientsForLanguage(recipe, "en");
  const ingredientsHu = ingredientsForLanguage(recipe, "hu");
  const ingredientsZh = ingredientsForLanguage(recipe, "zh");
  const history = recipe.history || [];

  els.recipeTitle.textContent = recipeTitle(recipe);
  els.recipeNumber.textContent = recipe.number;
  els.recipeCategory.textContent = categoryLabel(recipe.category);
  els.recipeStatus.textContent = statusLabel(recipe.status);
  els.recipeStatus.dataset.status = recipe.status || "needs_review";
  els.recipePages.textContent = recipe.sourcePages?.join(", ") || "-";
  els.ingredientCount.textContent = `${ingredients.length} items`;
  els.historyCount.textContent = `${history.length} entries`;

  renderArray(els.ingredientsList, ingredients, "No English ingredients have been cleaned yet.");
  renderArray(els.ingredientsHuList, ingredientsHu, "No Hungarian source ingredients have been found yet.");
  renderArray(els.ingredientsZhList, ingredientsZh, "No Chinese ingredients have been cleaned yet.");
  els.englishText.textContent = formatSteps(stepsFor(recipe, "en"), "No English steps have been cleaned yet.");
  els.sourceText.textContent = formatSteps(stepsFor(recipe, "hu"), "No Hungarian source steps have been found yet.");
  els.chineseText.textContent = formatSteps(stepsFor(recipe, "zh"), "No Chinese steps have been cleaned yet.");

  els.historyList.innerHTML = history.length
    ? history.map((entry) => `
      <article>
        <strong>${entry.summary}</strong>
        <span>${entry.date} / ${entry.user}</span>
      </article>
    `).join("")
    : "<p class=\"login-note\">No changes recorded yet.</p>";
}

function render() {
  renderUser();
  renderList();
  renderDetail();
}

function openModal(modal) {
  modal.hidden = false;
  modal.classList.add("open");
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.hidden = true;
}

function openLogin() {
  els.loginEmail.value = currentUser?.email || "";
  els.loginPassword.value = "";
  els.loginNote.textContent = "Use the account created in Supabase. If this is a new user, the app will try to create it.";
  openModal(els.loginDialog);
}

async function handleLoginButton() {
  if (currentUser && supabaseClient) {
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentProfile = null;
    appData = { meta: {}, categories: [], recipes: [] };
    backendReady = false;
    renderFilters();
    render();
    updateSourceMeta("please sign in");
    return;
  }
  openLogin();
}

async function loadCurrentUser() {
  if (!supabaseClient) return;
  const { data: sessionData } = await withTimeout(supabaseClient.auth.getSession(), "Session check");
  currentUser = sessionData.session?.user || null;
  currentProfile = null;
  if (!currentUser) return;

  const { data: profile } = await withTimeout(supabaseClient
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", currentUser.id)
    .maybeSingle(), "Profile load");
  currentProfile = profile || { id: currentUser.id, display_name: currentUser.email, role: "viewer" };
}

async function saveLogin() {
  if (!supabaseClient) {
    els.loginNote.textContent = "Database login is not configured yet.";
    return;
  }

  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  if (!email || !password) {
    els.loginNote.textContent = "Please enter both email and password.";
    return;
  }

  els.saveLogin.disabled = true;
  els.loginNote.textContent = "Signing in...";
  try {
    let result = await withTimeout(supabaseClient.auth.signInWithPassword({ email, password }), "Sign in");
    if (result.error && /invalid|not found|credentials/i.test(result.error.message)) {
      result = await withTimeout(supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { display_name: email.split("@")[0] } },
      }), "Account creation");
    }

    if (result.error) {
      els.loginNote.textContent = result.error.message;
      return;
    }

    await loadCurrentUser();
    closeModal(els.loginDialog);
    render();
    loadRecipesFromSupabase();
  } catch (error) {
    els.loginNote.textContent = error.message || "Sign in failed. Please refresh and try again.";
  } finally {
    els.saveLogin.disabled = false;
  }
}

function openEditor() {
  if (supabaseClient && !currentUser) {
    openLogin();
    return;
  }
  if (!canEditRecipes()) {
    updateSourceMeta("this user is read only");
    return;
  }

  const recipe = appData.recipes.find((item) => item.id === selectedId);
  if (!recipe) return;

  els.editTitleEn.value = recipe.titleEn || "";
  els.editTitleHu.value = recipe.title || "";
  els.editTitleZh.value = recipe.titleZh || "";
  els.editIngredients.value = (recipe.ingredientsEn || []).join("\n");
  els.editIngredientsHu.value = (recipe.ingredients || []).join("\n");
  els.editIngredientsZh.value = (recipe.ingredientsZh || []).join("\n");
  els.editMethod.value = stepsFor(recipe, "en").join("\n");
  els.editHungarianNotes.value = stepsFor(recipe, "hu").join("\n");
  els.editChineseNotes.value = stepsFor(recipe, "zh").join("\n");
  els.editSummary.value = "";
  openModal(els.editDialog);
}

function updateLocalRecipe(recipe, next) {
  Object.assign(recipe, next);
  recipe.history = [
    { date: next.updatedAt, user: currentUser?.email || "Restaurant team", summary: next.summary },
    ...(recipe.history || []),
  ];
}

async function saveEditor() {
  const recipe = appData.recipes.find((item) => item.id === selectedId);
  if (!recipe || !canEditRecipes()) return;

  const now = new Date().toISOString();
  const summary = els.editSummary.value.trim() || "Updated recipe text";
  const next = {
    titleEn: els.editTitleEn.value.trim() || recipe.titleEn,
    title: els.editTitleHu.value.trim() || recipe.title,
    titleZh: els.editTitleZh.value.trim() || recipe.titleZh,
    ingredientsEn: splitLines(els.editIngredients.value),
    ingredients: splitLines(els.editIngredientsHu.value),
    ingredientsZh: splitLines(els.editIngredientsZh.value),
    methodEn: splitLines(els.editMethod.value),
    method: splitLines(els.editHungarianNotes.value),
    methodZh: splitLines(els.editChineseNotes.value),
    status: "reviewed",
    updatedAt: now.slice(0, 10),
    summary,
  };

  els.saveEdit.disabled = true;
  if (backendReady && supabaseClient && recipe.dbId && currentUser) {
    const snapshot = { before: recipe, after: next };
    const updates = [
      { lang: "en", title: next.titleEn, ingredients: next.ingredientsEn, steps: next.methodEn },
      { lang: "hu", title: next.title, ingredients: next.ingredients, steps: next.method },
      { lang: "zh", title: next.titleZh, ingredients: next.ingredientsZh, steps: next.methodZh },
    ];

    const { error: recipeError } = await supabaseClient
      .from("recipes")
      .update({ status: "reviewed", updated_at: now })
      .eq("id", recipe.dbId);
    if (recipeError) return showSaveError(recipeError.message);

    for (const item of updates) {
      const { error } = await supabaseClient.from("recipe_i18n").upsert({
        recipe_id: recipe.dbId,
        lang: item.lang,
        title: item.title || "",
        ingredients: item.ingredients || [],
        steps: item.steps || [],
        updated_at: now,
      }, { onConflict: "recipe_id,lang" });
      if (error) return showSaveError(error.message);
    }

    const { error: versionError } = await supabaseClient.from("recipe_versions").insert({
      recipe_id: recipe.dbId,
      changed_by: currentUser.id,
      change_summary: summary,
      snapshot,
    });
    if (versionError) return showSaveError(versionError.message);

    await loadRecipesFromSupabase();
  } else {
    updateLocalRecipe(recipe, next);
  }

  els.saveEdit.disabled = false;
  closeModal(els.editDialog);
  render();
}

async function setRecipeStatus(status) {
  const recipe = currentRecipe();
  if (!recipe || !canEditRecipes()) return;

  const now = new Date().toISOString();
  const summary = status === "reviewed" ? "Marked recipe as reviewed" : "Marked recipe as needs review";
  els.reviewButton.disabled = true;
  els.needsReviewButton.disabled = true;

  if (backendReady && supabaseClient && recipe.dbId && currentUser) {
    const { error: recipeError } = await supabaseClient
      .from("recipes")
      .update({ status, updated_at: now })
      .eq("id", recipe.dbId);
    if (recipeError) {
      updateSourceMeta(`review update failed: ${recipeError.message}`);
      renderUser();
      return;
    }

    const { error: versionError } = await supabaseClient.from("recipe_versions").insert({
      recipe_id: recipe.dbId,
      changed_by: currentUser.id,
      change_summary: summary,
      snapshot: { status, source: "review-mode" },
    });
    if (versionError) {
      updateSourceMeta(`history update failed: ${versionError.message}`);
      renderUser();
      return;
    }

    await loadRecipesFromSupabase();
    updateSourceMeta(status === "reviewed" ? "reviewed" : "needs review");
    return;
  }

  recipe.status = status;
  recipe.history = [
    { date: now.slice(0, 10), user: currentUser?.email || "Restaurant team", summary },
    ...(recipe.history || []),
  ];
  render();
}

function showSaveError(message) {
  els.saveEdit.disabled = false;
  els.editSummary.value = `Save failed: ${message}`;
}

function exportData() {
  const payload = JSON.stringify({ ...appData, recipes: appData.recipes }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recipe-wiki-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

function recipeFromRow(row, versions) {
  const localized = Object.fromEntries((row.recipe_i18n || []).map((item) => [item.lang, item]));
  const en = localized.en || {};
  const hu = localized.hu || {};
  const zh = localized.zh || {};
  return {
    id: row.legacy_id || row.id,
    dbId: row.id,
    number: row.number,
    category: row.category,
    status: row.status,
    source: row.source,
    titleEn: en.title || hu.title || "",
    title: hu.title || en.title || "",
    titleZh: zh.title || en.title || "",
    ingredientsEn: en.ingredients || [],
    ingredients: hu.ingredients || [],
    ingredientsZh: zh.ingredients || [],
    methodEn: en.steps || [],
    method: hu.steps || [],
    methodZh: zh.steps || [],
    history: versions
      .filter((version) => version.recipe_id === row.id)
      .map((version) => ({
        summary: version.change_summary || "Updated recipe",
        date: String(version.created_at || "").slice(0, 10),
        user: version.profile_name || version.changed_by || "Supabase user",
      })),
  };
}

async function loadRecipesFromSupabase() {
  if (!supabaseClient || loadingBackend || !currentUser) return;
  loadingBackend = true;
  updateSourceMeta("loading database");

  const { data: rows, error } = await withTimeout(
    supabaseClient
      .from("recipes")
      .select("id, legacy_id, number, category, status, source, recipe_i18n(lang, title, ingredients, steps, notes)")
      .order("number"),
    "Recipe load",
    15000
  );
  if (error) {
    loadingBackend = false;
    updateSourceMeta(`database unavailable: ${error.message}`);
    return;
  }

  if (!rows.length) {
    backendReady = false;
    loadingBackend = false;
    updateSourceMeta("database connected, no recipes imported yet");
    render();
    return;
  }

  const { data: versions } = await supabaseClient
    .from("recipe_versions")
    .select("recipe_id, change_summary, changed_by, created_at")
    .order("created_at", { ascending: false });

  backendReady = true;
  appData = {
    meta: { source: "Supabase", totalParagraphs: rows.length },
    categories: [...new Set(rows.map((row) => row.category).filter(Boolean))],
    recipes: rows.map((row) => recipeFromRow(row, versions || [])),
  };
  if (!appData.recipes.some((recipe) => recipe.id === selectedId)) selectedId = appData.recipes[0]?.id || null;
  loadingBackend = false;
  renderFilters();
  render();
}

async function openUsers() {
  if (!canManageUsers()) return;
  els.usersNote.textContent = canManageUsers()
    ? "Change roles carefully. Viewers can read only; kitchen and translator can edit recipes; managers can also review users."
    : "This user cannot manage users.";
  openModal(els.usersDialog);
  await loadUsers();
}

async function loadUsers() {
  if (!supabaseClient || !canManageUsers()) return;
  els.usersList.innerHTML = "<p class=\"login-note\">Loading users...</p>";
  const { data: profiles, error } = await supabaseClient
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    els.usersList.innerHTML = `<p class="login-note">Could not load users: ${error.message}</p>`;
    return;
  }

  els.usersList.innerHTML = (profiles || []).map((profile) => `
    <article class="user-row" data-user-id="${profile.id}">
      <div>
        <strong>${profile.display_name || "Unnamed user"}</strong>
        <span>${profile.id}</span>
      </div>
      <select ${currentRole() !== "owner" ? "disabled" : ""}>
        ${["viewer", "translator", "kitchen", "manager", "owner"].map((role) => `
          <option value="${role}" ${profile.role === role ? "selected" : ""}>${role}</option>
        `).join("")}
      </select>
    </article>
  `).join("");
}

async function updateUserRole(event) {
  const select = event.target.closest(".user-row select");
  if (!select || currentRole() !== "owner") return;
  const row = select.closest(".user-row");
  const id = row.dataset.userId;
  const role = select.value;
  const { error } = await supabaseClient.from("profiles").update({ role }).eq("id", id);
  els.usersNote.textContent = error ? `Could not update role: ${error.message}` : "Role updated.";
  if (id === currentUser?.id) await loadCurrentUser();
  renderUser();
}

async function initBackend() {
  if (!supabaseClient) return;
  await loadCurrentUser();
  if (currentUser) {
    await loadRecipesFromSupabase();
  } else {
    updateSourceMeta("please sign in");
  }
  supabaseClient.auth.onAuthStateChange(async () => {
    await loadCurrentUser();
    if (currentUser) await loadRecipesFromSupabase();
    render();
  });
}

els.recipeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  selectedId = button.dataset.id;
  render();
});

els.searchInput.addEventListener("input", render);
els.categorySelect.addEventListener("change", render);
els.statusSelect.addEventListener("change", render);
els.languageSelect.addEventListener("change", render);
els.loginButton.addEventListener("click", handleLoginButton);
els.manageUsersButton.addEventListener("click", openUsers);
els.reviewButton.addEventListener("click", () => setRecipeStatus("reviewed"));
els.needsReviewButton.addEventListener("click", () => setRecipeStatus("needs_review"));
els.refreshUsers.addEventListener("click", loadUsers);
els.usersList.addEventListener("change", updateUserRole);
els.saveLogin.addEventListener("click", saveLogin);
els.editButton.addEventListener("click", openEditor);
els.saveEdit.addEventListener("click", saveEditor);
els.exportButton.addEventListener("click", exportData);
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(document.querySelector(`#${button.dataset.close}`));
  });
});

renderFilters();
render();
initBackend();
