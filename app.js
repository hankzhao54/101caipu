const appVersion = "supabase1";
const fallbackData = window.RECIPE_WIKI_DATA || { meta: {}, categories: [], recipes: [] };
const supabaseSettings = window.RECIPE_WIKI_SUPABASE;
const requireAuth = Boolean(supabaseSettings?.requireAuth);
const supabaseClient =
  window.supabase && supabaseSettings?.url && supabaseSettings?.anonKey
    ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey)
    : null;

const categoryNames = {
  Stocks: ["Stocks", "高汤"],
  Sauces: ["Sauces", "酱汁"],
  Prep: ["Prep", "预处理"],
  "Bakery and sweets": ["Bakery and sweets", "甜点和烘焙"],
  Dumplings: ["Dumplings", "饺子"],
  "Ferments and pickles": ["Ferments and pickles", "发酵和腌制"],
  Cakes: ["Cakes", "糕点"],
  Noodles: ["Noodles", "面条"],
  "Spices and oils": ["Spices and oils", "香料和油"],
  "Nuts and garnish": ["Nuts and garnish", "坚果和配料"],
};

const els = {
  recipeCount: document.querySelector("#recipeCount"),
  searchInput: document.querySelector("#searchInput"),
  languageSelect: document.querySelector("#languageSelect"),
  categorySelect: document.querySelector("#categorySelect"),
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
  editButton: document.querySelector("#editButton"),
  exportButton: document.querySelector("#exportButton"),
  editDialog: document.querySelector("#editDialog"),
  loginDialog: document.querySelector("#loginDialog"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginNote: document.querySelector("#loginNote"),
  saveLogin: document.querySelector("#saveLogin"),
  editTitleZh: document.querySelector("#editTitleZh"),
  editTitleHu: document.querySelector("#editTitleHu"),
  editTitleEn: document.querySelector("#editTitleEn"),
  editIngredients: document.querySelector("#editIngredients"),
  editMethod: document.querySelector("#editMethod"),
  editHungarianNotes: document.querySelector("#editHungarianNotes"),
  editChineseNotes: document.querySelector("#editChineseNotes"),
  editSummary: document.querySelector("#editSummary"),
  saveEdit: document.querySelector("#saveEdit"),
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

function cleanText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
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

function renderUser() {
  if (currentUser) {
    const label = currentProfile?.display_name || currentUser.email || "Signed in";
    const role = currentProfile?.role || "viewer";
    els.userBadge.textContent = `${label} / ${role}`;
    els.loginButton.textContent = "Sign out";
  } else if (supabaseClient) {
    els.userBadge.textContent = backendReady ? "Guest / database connected" : "Guest / database";
    els.loginButton.textContent = "Sign in";
  } else {
    els.userBadge.textContent = "Guest / local backup";
    els.loginButton.textContent = "Sign in";
  }
  els.editButton.disabled = false;
}

function renderFilters() {
  const categories = ["All", ...appData.categories];
  els.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category === "All" ? "All" : categoryLabel(category, "en")}</option>`)
    .join("");
  els.recipeCount.textContent = appData.recipes.length ? `${appData.recipes.length} recipes` : "Sign in";
  updateSourceMeta();
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

function filteredRecipes() {
  const query = els.searchInput.value.trim().toLowerCase();
  const category = els.categorySelect.value;
  return appData.recipes.filter((recipe) => {
    const haystack = [
      recipe.number,
      recipe.title,
      recipe.titleEn,
      recipe.titleZh,
      recipe.category,
      recipe.categoryHu,
      recipe.categoryZh,
      recipe.content,
      ...(recipe.ingredients || []),
      ...(recipe.ingredientsEn || []),
      ...(recipe.ingredientsZh || []),
      ...(recipe.method || []),
      ...(recipe.methodEn || []),
      ...(recipe.methodZh || []),
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (category === "All" || recipe.category === category);
  });
}

function renderList() {
  const recipes = filteredRecipes();
  if (!recipes.some((recipe) => recipe.id === selectedId)) selectedId = recipes[0]?.id || appData.recipes[0]?.id;
  if (!recipes.length) {
    els.recipeList.innerHTML = "<p class=\"login-note\">Sign in to load recipes from the database.</p>";
    return;
  }
  els.recipeList.innerHTML = recipes.map((recipe) => `
    <button class="recipe-item ${recipe.id === selectedId ? "active" : ""}" data-id="${recipe.id}" type="button">
      <strong>${recipe.number} ${recipeTitle(recipe)}</strong>
      <span>${categoryLabel(recipe.category)} / ${recipe.status === "reviewed" ? "Reviewed" : "Needs review"}</span>
    </button>
  `).join("");
}

function renderDetail() {
  const recipe = appData.recipes.find((item) => item.id === selectedId) || appData.recipes[0];
  if (!recipe) {
    els.recipeTitle.textContent = "Sign in required";
    els.recipeNumber.textContent = "-";
    els.recipeCategory.textContent = "-";
    els.recipeStatus.textContent = "Locked";
    els.recipePages.textContent = "-";
    els.ingredientCount.textContent = "0 items";
    els.historyCount.textContent = "0 entries";
    renderArray(els.ingredientsList, [], "Sign in to view ingredients.");
    renderArray(els.ingredientsHuList, [], "Sign in to view Hungarian source ingredients.");
    renderArray(els.ingredientsZhList, [], "Sign in to view Chinese ingredients.");
    els.englishText.textContent = "Sign in to view steps.";
    els.sourceText.textContent = "Sign in to view steps.";
    els.chineseText.textContent = "Sign in to view steps.";
    els.historyList.innerHTML = "<p class=\"login-note\">No database session yet.</p>";
    return;
  }

  const ingredients = ingredientsForLanguage(recipe, "en");
  const ingredientsHu = ingredientsForLanguage(recipe, "hu");
  const ingredientsZh = ingredientsForLanguage(recipe, "zh");
  const history = recipe.history || [];

  els.recipeTitle.textContent = recipeTitle(recipe);
  els.recipeNumber.textContent = recipe.number;
  els.recipeCategory.textContent = categoryLabel(recipe.category);
  els.recipeStatus.textContent = recipe.status === "reviewed" ? "Reviewed" : "Needs review";
  els.recipePages.textContent = recipe.sourcePages?.join(", ") || "-";
  els.ingredientCount.textContent = `${ingredients.length} items`;
  els.historyCount.textContent = `${history.length} entries`;

  renderArray(els.ingredientsList, ingredients, "No ingredients have been cleaned yet.");
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
    render();
    return;
  }
  openLogin();
}

async function loadCurrentUser() {
  if (!supabaseClient) return;
  const { data: sessionData } = await supabaseClient.auth.getSession();
  currentUser = sessionData.session?.user || null;
  currentProfile = null;
  if (!currentUser) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("display_name, role")
    .eq("id", currentUser.id)
    .maybeSingle();
  currentProfile = profile || { display_name: currentUser.email, role: "viewer" };
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
  let result = await supabaseClient.auth.signInWithPassword({ email, password });
  if (result.error && /invalid|not found|credentials/i.test(result.error.message)) {
    result = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { display_name: email.split("@")[0] } },
    });
  }
  els.saveLogin.disabled = false;

  if (result.error) {
    els.loginNote.textContent = result.error.message;
    return;
  }

  await loadCurrentUser();
  closeModal(els.loginDialog);
  render();
}

function openEditor() {
  if (supabaseClient && !currentUser) {
    openLogin();
    return;
  }

  const recipe = appData.recipes.find((item) => item.id === selectedId);
  if (!recipe) return;

  els.editTitleEn.value = recipe.titleEn || "";
  els.editTitleHu.value = recipe.title || "";
  els.editTitleZh.value = recipe.titleZh || "";
  els.editIngredients.value = (recipe.ingredientsEn || recipe.ingredients || []).join("\n");
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
  if (!recipe) return;

  const now = new Date().toISOString();
  const summary = els.editSummary.value.trim() || "Updated recipe text";
  const next = {
    titleEn: els.editTitleEn.value.trim() || recipe.titleEn,
    title: els.editTitleHu.value.trim() || recipe.title,
    titleZh: els.editTitleZh.value.trim() || recipe.titleZh,
    ingredientsEn: els.editIngredients.value.split(/\n/).map((line) => line.trim()).filter(Boolean),
    methodEn: els.editMethod.value.split(/\n/).map((line) => line.trim()).filter(Boolean),
    method: els.editHungarianNotes.value.split(/\n/).map((line) => line.trim()).filter(Boolean),
    methodZh: els.editChineseNotes.value.split(/\n/).map((line) => line.trim()).filter(Boolean),
    status: "reviewed",
    updatedAt: now.slice(0, 10),
    summary,
  };

  els.saveEdit.disabled = true;
  if (backendReady && supabaseClient && recipe.dbId && currentUser) {
    const snapshot = { recipe, next };
    const updates = [
      { lang: "en", title: next.titleEn, ingredients: next.ingredientsEn, steps: next.methodEn },
      { lang: "hu", title: next.title, ingredients: recipe.ingredients || [], steps: next.method },
      { lang: "zh", title: next.titleZh, ingredients: recipe.ingredientsZh || [], steps: next.methodZh },
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
        user: version.changed_by || "Supabase user",
      })),
  };
}

async function loadRecipesFromSupabase() {
  if (!supabaseClient || loadingBackend) return;
  loadingBackend = true;
  updateSourceMeta("loading database");

  const { data: rows, error } = await supabaseClient
    .from("recipes")
    .select("id, legacy_id, number, category, status, source, recipe_i18n(lang, title, ingredients, steps, notes)")
    .order("number");
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
els.languageSelect.addEventListener("change", render);
els.loginButton.addEventListener("click", handleLoginButton);
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
