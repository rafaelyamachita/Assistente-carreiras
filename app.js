(() => {
  "use strict";

  const STORAGE_KEY = "meu-assistente-carreira-v1";
  const THEME_STORAGE_KEY = "meu-assistente-carreira-tema";
  const ONBOARDING_STORAGE_KEY = "meu-assistente-carreira-tutorial-concluido";
  const PDFJS_VERSION = "4.10.38";
  const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
  const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
  const STATUSES = {
    saved: "Salva",
    planned: "Candidatura planejada",
    applied: "Candidatado",
    interview: "Entrevista",
    offer: "Proposta",
    rejected: "Encerrada"
  };
  const TOOL_CATALOG = [
    { name: "Adobe Photoshop", aliases: ["Adobe Photoshop", "Photoshop"] },
    { name: "Adobe Illustrator", aliases: ["Adobe Illustrator", "Illustrator"] },
    { name: "Adobe XD", aliases: ["Adobe XD"] },
    { name: "Adobe InDesign", aliases: ["Adobe InDesign", "InDesign"] },
    { name: "Adobe Premiere Pro", aliases: ["Adobe Premiere Pro", "Premiere Pro"] },
    { name: "Figma", aliases: ["Figma"] },
    { name: "Sketch", aliases: ["Sketch"] },
    { name: "Canva", aliases: ["Canva"] },
    { name: "InVision", aliases: ["InVision"] },
    { name: "Axure RP", aliases: ["Axure RP", "Axure"] },
    { name: "Miro", aliases: ["Miro"] },
    { name: "Zeplin", aliases: ["Zeplin"] },
    { name: "Framer", aliases: ["Framer"] },
    { name: "CorelDRAW", aliases: ["CorelDRAW", "Corel Draw"] },
    { name: "Blender", aliases: ["Blender"] },
    { name: "AutoCAD", aliases: ["AutoCAD"] },
    { name: "Microsoft Excel", aliases: ["Microsoft Excel", "Excel"] },
    { name: "Microsoft PowerPoint", aliases: ["Microsoft PowerPoint", "PowerPoint"] },
    { name: "Microsoft Word", aliases: ["Microsoft Word"] },
    { name: "Jira", aliases: ["Jira"] },
    { name: "Trello", aliases: ["Trello"] },
    { name: "Notion", aliases: ["Notion"] }
  ];
  const PROFICIENCY_LEVELS = [
    { value: "Básico", pattern: "basico|basica|iniciante|elementar|basic|beginner|novice" },
    { value: "Intermediário", pattern: "intermediario|intermediaria|intermediate" },
    { value: "Avançado", pattern: "avancado|avancada|advanced" },
    { value: "Especialista", pattern: "especialista|expert" }
  ];
  const JOB_SEARCH_CACHE_KEY = "meu-assistente-carreira-busca-sessao-v2";
  const JOB_SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
  const JOB_LOCATION_PREFERENCES_KEY = "meu-assistente-carreira-localizacao-v1";
  const JOB_FEED_URL = new URL("data/jobs-feed.json", document.baseURI);
  const JOB_FEED_STALE_AFTER_MS = 36 * 60 * 60 * 1000;
  const JOB_RESULTS_PAGE_SIZE = 10;
  const JOB_FIT_WEIGHTS = {
    skills: 35,
    experience: 25,
    role: 20,
    location: 10,
    education: 10
  };
  const JOB_TERM_EQUIVALENCES = [
    ["ux", "user experience", "experiencia do usuario", "experiencia del usuario"],
    ["ui", "user interface", "interface do usuario", "interface del usuario"],
    ["product designer", "designer de produto", "design de produto"],
    ["product design", "design de produto"],
    ["user research", "pesquisa com usuarios", "pesquisa do usuario"],
    ["prototyping", "prototipacao"],
    ["responsive design", "design responsivo"],
    ["visual hierarchy", "hierarquia visual"],
    ["interaction design", "design de interacao"],
    ["bachelor", "bacharelado", "graduacao"],
    ["master", "mestrado"]
  ];
  const JOB_SEARCH_ROLE_TRANSLATIONS = [
    ["product designer", "designer de produto"],
    ["ux/ui designer", "designer de ux/ui"],
    ["ux designer", "designer de experiencia do usuario"],
    ["ui designer", "designer de interface"],
    ["digital designer", "designer digital"],
    ["graphic designer", "designer grafico"],
    ["data analyst", "analista de dados"],
    ["software engineer", "engenheiro de software"],
    ["front-end developer", "desenvolvedor front-end"],
    ["back-end developer", "desenvolvedor back-end"],
    ["product manager", "gerente de produto"],
    ["designer de produto", "product designer"],
    ["designer de ux/ui", "ux/ui designer"],
    ["designer de experiencia do usuario", "ux designer"],
    ["designer de interface", "ui designer"],
    ["designer digital", "digital designer"],
    ["designer grafico", "graphic designer"],
    ["analista de dados", "data analyst"],
    ["engenheiro de software", "software engineer"],
    ["desenvolvedor front-end", "front-end developer"],
    ["desenvolvedor back-end", "back-end developer"],
    ["gerente de produto", "product manager"]
  ];
  const emptyData = () => ({
    resume: { name: "", email: "", contact: "", location: "", currentRole: "", level: "", targetRole: "", summary: "", skills: "", experience: "", experienceEntries: [], education: "", courses: "", certifications: "", tools: "", toolsEntries: [], toolsReviewNotes: "", otherInfo: "", pdfText: "", pdfOrganizedText: "" },
    jobs: [],
    jobAnalyses: []
  });
  const resumeForm = document.querySelector("#resume-form");
  const jobForm = document.querySelector("#job-form");
  const jobDialog = document.querySelector("#job-dialog");
  const jobDetailsDialog = document.querySelector("#job-details-dialog");
  const jobDetailsContent = document.querySelector("#job-details-content");
  const jobsList = document.querySelector("#jobs-list");
  const emptyState = document.querySelector("#empty-state");
  const statusFilter = document.querySelector("#status-filter");
  const toast = document.querySelector("#toast");
  const pdfInput = document.querySelector("#resume-pdf-input");
  const pdfDropzone = document.querySelector("#pdf-dropzone");
  const resumeProfileView = document.querySelector("#resume-profile-view");
  const resumeReviewDialog = document.querySelector("#resume-review-dialog");
  const resumeReviewForm = document.querySelector("#resume-review-form");
  const resumeExperienceEditor = document.querySelector("#resume-experiences-editor");
  const resumeToolsEditor = document.querySelector("#resume-tools-editor");
  const jobSearchForm = document.querySelector("#job-search-form");
  const jobSearchQuery = document.querySelector("#job-search-query");
  const jobSearchResults = document.querySelector("#job-search-results");
  const jobSearchStatus = document.querySelector("#job-search-status");
  const jobSourceStatus = document.querySelector("#job-source-status");
  const jobAnalysisForm = document.querySelector("#job-analysis-form");
  const jobAnalysisStatus = document.querySelector("#job-analysis-status");
  const jobAnalysisResult = document.querySelector("#job-analysis-result");
  let discoveredJobs = [];
  let discoveredSources = [];
  let publishedFeedJobs = [];
  let publishedFeedMetadata = null;
  let publishedFeedError = "";
  let discoveredJobsPage = 0;
  let jobSearchBusy = false;
  let jobAnalysisBusy = false;
  let activeJobAnalysisId = "";
  let reviewMode = "import";
  let currentReviewPage = 0;
  let currentProfilePage = 0;
  let currentOriginalPdfText = "";
  let pdfModulePromise;
  let pdfProcessing = false;
  let toastTimer;
  let saveTimer;
  let data = loadData();

  function applyTheme(theme, persist = false) {
    const selectedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selectedTheme;
    const toggle = document.querySelector("#theme-toggle");
    const label = selectedTheme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro";
    toggle.setAttribute("aria-checked", String(selectedTheme === "dark"));
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    document.querySelector('meta[name="theme-color"]').content = selectedTheme === "dark" ? "#191821" : "#f6f7fb";
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
      } catch (error) {
        console.error("Não foi possível salvar a preferência de tema.", error);
        showToast("O tema foi alterado, mas a preferência não pôde ser salva neste navegador.", true);
      }
    }
  }

  function initializeTheme() {
    let savedTheme = "";
    try {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "";
    } catch (error) {
      console.error("Não foi possível ler a preferência de tema.", error);
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
    applyTheme(savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light");
  }

  function setOnboardingStep(step) {
    const cards = [...document.querySelectorAll(".onboarding-card")];
    const selectedStep = Math.max(0, Math.min(step, cards.length - 1));
    const previousButton = document.querySelector("#onboarding-previous");
    const nextButton = document.querySelector("#onboarding-next");
    const startButton = document.querySelector("#onboarding-start");
    const stepLabel = document.querySelector("#onboarding-step-label");
    const progress = document.querySelector("#onboarding-progress");
    const progressFill = document.querySelector("#onboarding-progress-fill");
    const dots = [...document.querySelectorAll(".onboarding-dot")];

    for (const [index, card] of cards.entries()) {
      card.hidden = index !== selectedStep;
      card.classList.toggle("is-active", index === selectedStep);
    }
    for (const [index, dot] of dots.entries()) {
      dot.classList.toggle("is-active", index === selectedStep);
      dot.classList.toggle("is-complete", index < selectedStep);
    }
    const title = cards[selectedStep].querySelector("h1, h2");
    const description = cards[selectedStep].querySelector(".onboarding-card > p:not(.eyebrow):not(.onboarding-note)");
    const dialog = document.querySelector("#onboarding-dialog");
    if (!description.id) description.id = `onboarding-description-${selectedStep + 1}`;
    dialog.setAttribute("aria-labelledby", title.id);
    dialog.setAttribute("aria-describedby", description.id);
    stepLabel.textContent = `${selectedStep + 1} de ${cards.length}`;
    progress.setAttribute("aria-valuenow", String(selectedStep + 1));
    progressFill.style.width = `${((selectedStep + 1) / cards.length) * 100}%`;
    previousButton.disabled = selectedStep === 0;
    nextButton.hidden = selectedStep === cards.length - 1;
    startButton.hidden = selectedStep !== cards.length - 1;
    return selectedStep;
  }

  function openOnboarding() {
    setOnboardingStep(0);
    const dialog = document.querySelector("#onboarding-dialog");
    if (!dialog.open) dialog.showModal();
    document.querySelector("#onboarding-title").focus();
  }

  function initializeOnboarding() {
    const dialog = document.querySelector("#onboarding-dialog");
    let completed = false;
    try {
      completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    } catch (error) {
      console.error("Não foi possível ler a preferência do tutorial.", error);
    }

    document.querySelector("#help-button").addEventListener("click", openOnboarding);
    document.querySelector("#onboarding-previous").addEventListener("click", () => {
      const current = Number(dialog.querySelector(".onboarding-card.is-active").dataset.onboardingStep);
      setOnboardingStep(current - 1);
      dialog.querySelector(".onboarding-card.is-active h1, .onboarding-card.is-active h2").focus();
    });
    document.querySelector("#onboarding-next").addEventListener("click", () => {
      const current = Number(dialog.querySelector(".onboarding-card.is-active").dataset.onboardingStep);
      setOnboardingStep(current + 1);
      dialog.querySelector(".onboarding-card.is-active h1, .onboarding-card.is-active h2").focus();
    });
    const finish = () => dialog.close();
    document.querySelector("#onboarding-skip").addEventListener("click", finish);
    document.querySelector("#onboarding-start").addEventListener("click", finish);
    dialog.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const current = Number(dialog.querySelector(".onboarding-card.is-active").dataset.onboardingStep);
      setOnboardingStep(current + (event.key === "ArrowRight" ? 1 : -1));
      dialog.querySelector(".onboarding-card.is-active h1, .onboarding-card.is-active h2").focus();
    });
    dialog.addEventListener("close", () => {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      } catch (error) {
        console.error("Não foi possível salvar a conclusão do tutorial.", error);
        showToast("O tutorial foi fechado, mas não foi possível salvar essa preferência neste navegador.", true);
      }
    });
    if (!completed) openOnboarding();
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      return normalizeData(JSON.parse(raw));
    } catch (error) {
      console.error("Não foi possível carregar os dados locais.", error);
      showToast("Não foi possível ler os dados salvos. Tente importar um backup JSON.", true);
      return emptyData();
    }
  }

  function normalizeData(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Formato de dados inválido.");
    const resume = value.resume && typeof value.resume === "object" && !Array.isArray(value.resume) ? value.resume : {};
    const fields = ["name", "email", "contact", "location", "currentRole", "level", "targetRole", "summary", "skills", "experience", "education", "courses", "certifications", "tools", "otherInfo", "pdfText", "pdfOrganizedText"];
    const normalizedResume = {};
    for (const field of fields) normalizedResume[field] = typeof resume[field] === "string" ? resume[field] : "";
    normalizedResume.experienceEntries = Array.isArray(resume.experienceEntries)
      ? resume.experienceEntries.filter((entry) => entry && typeof entry === "object").map((entry) => ({
        company: textValue(entry.company),
        role: textValue(entry.role),
        period: textValue(entry.period),
        description: textValue(entry.description)
      }))
      : [];
    normalizedResume.toolsEntries = Array.isArray(resume.toolsEntries)
      ? resume.toolsEntries.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)).map((entry) => ({
        name: textValue(entry.name),
        level: textValue(entry.level)
      })).filter((entry) => entry.name.trim())
      : [];
    normalizedResume.toolsReviewNotes = textValue(resume.toolsReviewNotes);
    if (value.jobs !== undefined && !Array.isArray(value.jobs)) throw new Error("A lista de vagas do JSON é inválida.");
    const jobs = (value.jobs || []).map((job) => {
      if (!job || typeof job !== "object" || Array.isArray(job) || typeof job.title !== "string") {
        throw new Error("Uma vaga do JSON está em formato inválido.");
      }
      return {
        id: typeof job.id === "string" ? job.id : createId(),
        title: job.title,
        company: textValue(job.company),
        location: textValue(job.location),
        level: textValue(job.level),
        url: textValue(job.url),
        status: Object.hasOwn(STATUSES, job.status) ? job.status : "saved",
        requirements: textValue(job.requirements),
        notes: textValue(job.notes),
        createdAt: textValue(job.createdAt) || new Date().toISOString(),
        history: Array.isArray(job.history) ? job.history.filter((item) => item && typeof item === "object").map((item) => ({
          at: textValue(item.at),
          event: textValue(item.event),
          status: Object.hasOwn(STATUSES, item.status) ? item.status : ""
        })) : []
      };
    });
    if (value.jobAnalyses !== undefined && !Array.isArray(value.jobAnalyses)) throw new Error("A lista de análises de vagas do JSON é inválida.");
    const jobAnalyses = (value.jobAnalyses || []).filter((analysis) => analysis && typeof analysis === "object" && !Array.isArray(analysis)).map((analysis) => ({
      id: textValue(analysis.id) || createId(),
      url: safeUrl(textValue(analysis.url)),
      canonicalUrl: safeUrl(textValue(analysis.canonicalUrl)),
      title: textValue(analysis.title),
      company: textValue(analysis.company),
      location: textValue(analysis.location),
      modality: ["remote", "hybrid", "onsite"].includes(analysis.modality) ? analysis.modality : "",
      seniority: textValue(analysis.seniority),
      salary: textValue(analysis.salary),
      responsibilities: listText(analysis.responsibilities),
      description: textValue(analysis.description),
      requiredRequirements: listText(analysis.requiredRequirements),
      preferredRequirements: listText(analysis.preferredRequirements),
      skills: listText(analysis.skills),
      tools: listText(analysis.tools),
      educationRequirements: listText(analysis.educationRequirements),
      experienceRequirements: listText(analysis.experienceRequirements),
      personalNotes: textValue(analysis.personalNotes),
      method: analysis.method === "automatic" ? "automatic" : "manual",
      completeness: analysis.completeness === "complete" ? "complete" : "partial",
      status: ["analyzed", "interesting", "planned", "applied"].includes(analysis.status) ? analysis.status : "analyzed",
      trackedJobId: textValue(analysis.trackedJobId),
      createdAt: textValue(analysis.createdAt) || new Date().toISOString(),
      updatedAt: textValue(analysis.updatedAt) || textValue(analysis.createdAt) || new Date().toISOString()
    }));
    return { resume: normalizedResume, jobs, jobAnalyses };
  }

  function textValue(value) {
    return typeof value === "string" ? value : "";
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Não foi possível salvar os dados locais.", error);
      showToast("Não foi possível salvar. Verifique o espaço disponível no navegador.", true);
      return false;
    }
  }

  function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function showToast(message, isError = false) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  function fillResumeForm() {
    for (const [key, value] of Object.entries(data.resume)) {
      const field = resumeForm.elements.namedItem(key);
      if (!field) continue;
      if (key === "skills") field.value = resumeSkills(data.resume);
      else if (key === "tools") field.value = formatResumeTools(resumeTools(data.resume)) || value;
      else field.value = value;
    }
  }

  function updateResume() {
    const formData = new FormData(resumeForm);
    const previousTools = data.resume.tools;
    for (const key of Object.keys(data.resume)) {
      if (["experienceEntries", "toolsEntries", "toolsReviewNotes"].includes(key) || !resumeForm.elements.namedItem(key)) continue;
      data.resume[key] = String(formData.get(key) || "");
    }
    if (data.resume.tools !== previousTools) data.resume.toolsEntries = parseLegacyTools(data.resume.tools);
    const structuredExperience = formatExperiences(data.resume.experienceEntries);
    if (data.resume.experience.trim() !== structuredExperience.trim()) {
      data.resume.experienceEntries = data.resume.experience.trim()
        ? [{ company: "", role: "", period: "", description: data.resume.experience.trim() }]
        : [];
    }
    data.resume.pdfOrganizedText = composeOrganizedResume(data.resume) || data.resume.pdfText;
    if (saveData()) {
      document.querySelector("#save-message").textContent = "Currículo salvo neste navegador.";
      renderJobs();
      renderResumeProfile();
    }
  }

  function normalize(text) {
    return text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function toolAliases(tool) {
    return tool.aliases.map(normalize).sort((left, right) => right.length - left.length);
  }

  function findToolMentions(text) {
    const normalizedText = normalize(text);
    const matches = [];
    for (const tool of TOOL_CATALOG) {
      for (const alias of toolAliases(tool)) {
        const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(alias)})(?=$|[^\\p{L}\\p{N}])`, "giu");
        if (pattern.test(normalizedText)) {
          matches.push(tool);
          break;
        }
      }
    }
    return matches;
  }

  function proficiencyForToolLine(line, tool) {
    const normalizedLine = normalize(line);
    const aliases = toolAliases(tool);
    const levelAlternation = PROFICIENCY_LEVELS.map((level) => level.pattern).join("|");
    for (const alias of aliases) {
      const escapedAlias = escapeRegExp(alias);
      const before = normalizedLine.match(new RegExp(`(?:conhecimento|dominio|nivel|proficiencia)?\\s*(${levelAlternation})\\s+(?:de\\s+proficiencia\\s+)?(?:em|no|na|de|do|da)?\\s*${escapedAlias}(?=$|[^\\p{L}\\p{N}])`, "u"));
      const after = normalizedLine.match(new RegExp(`${escapedAlias}(?=$|[^\\p{L}\\p{N}])[\\s(,:;—–-]*(?:(?:nivel|proficiencia)\\s*)?(${levelAlternation})(?=$|[^\\p{L}\\p{N}])`, "u"));
      const match = before || after;
      if (match) return PROFICIENCY_LEVELS.find((level) => new RegExp(`^(?:${level.pattern})$`, "u").test(match[1]))?.value || "";
    }
    return "";
  }

  function extractToolData(text) {
    const toolsByName = new Map();
    const reviewNotes = new Set();
    const levelPattern = new RegExp(`\\b(?:${PROFICIENCY_LEVELS.map((level) => level.pattern).join("|")})\\b`, "gu");
    let activeSection = "other";
    let previousToolsLine = "";
    for (const rawLine of text.split(/\r?\n/).map(cleanPdfLine).filter(Boolean)) {
      const heading = findPdfSectionHeading(rawLine);
      if (heading) {
        if (heading.section !== "tools") previousToolsLine = "";
        activeSection = heading.section;
        if (!heading.content) continue;
      }
      const line = heading?.content || rawLine;
      const mentions = findToolMentions(line);
      if (!mentions.length) {
        const containsLevel = levelPattern.test(normalize(line));
        levelPattern.lastIndex = 0;
        if ((activeSection === "tools" || previousToolsLine) && containsLevel) {
          reviewNotes.add([previousToolsLine, line].filter(Boolean).join(" — "));
        }
        if (!containsLevel) previousToolsLine = "";
        continue;
      }
      previousToolsLine = mentions.map((tool) => tool.name).join(", ");
      for (const tool of mentions) {
        const level = proficiencyForToolLine(line, tool);
        const current = toolsByName.get(tool.name);
        if (current && current.level && level && current.level !== level) {
          reviewNotes.add(line);
          current.level = "";
        } else if (!current) {
          toolsByName.set(tool.name, { name: tool.name, level });
        } else if (level && !current.level) {
          current.level = level;
        }
      }
      const levelCount = [...normalize(line).matchAll(levelPattern)].length;
      levelPattern.lastIndex = 0;
      if (levelCount > 0 && mentions.some((tool) => !proficiencyForToolLine(line, tool))) {
        reviewNotes.add(line);
      }
    }
    return {
      toolsEntries: [...toolsByName.values()],
      toolsReviewNotes: [...reviewNotes].join("\n")
    };
  }

  function removeToolsFromSkills(skills) {
    const skillParts = skills.split(/[\n,;]+/).map((part) => part.trim()).filter(Boolean);
    const filtered = [];
    for (const part of skillParts) {
      const tools = findToolMentions(part);
      if (!tools.length) {
        filtered.push(part);
        continue;
      }
      let remainder = part;
      for (const tool of tools) {
        for (const alias of tool.aliases) {
          remainder = remainder.replace(new RegExp(escapeRegExp(alias).replace(/\s+/g, "\\s*"), "giu"), " ");
        }
      }
      const removableWords = [
        "conhecimento", "domínio", "dominio", "nível", "nivel", "proficiência", "proficiencia",
        "básico", "basico", "básica", "basica", "iniciante", "elementar",
        "intermediário", "intermediario", "intermediária", "intermediaria",
        "avançado", "avancado", "avançada", "avancada", "especialista", "expert",
        "de", "do", "da", "em", "no", "na"
      ];
      const wordPattern = new RegExp(`\\b(?:${removableWords.map(escapeRegExp).join("|")})\\b`, "giu");
      remainder = remainder.replace(wordPattern, " ").replace(/^[\s,;|:–—-]+|[\s,;|:–—-]+$/g, "").replace(/\s+/g, " ").trim();
      remainder = remainder.replace(/^(?:(?:e|ou)\s+|(?:e|ou)$)/i, "").replace(/\s+(?:e|ou)$/i, "").trim();
      if (remainder) filtered.push(remainder);
    }
    return filtered.join("\n");
  }

  function removeStandaloneProficiencyLines(value) {
    return value.split(/\r?\n/).filter((line) => {
      const normalizedLine = normalize(line);
      const containsLevel = PROFICIENCY_LEVELS.some((level) => new RegExp(`\\b(?:${level.pattern})\\b`, "u").test(normalizedLine));
      return !containsLevel || findToolMentions(line).length > 0;
    }).join("\n");
  }

  function parseLegacyTools(value) {
    return value.split(/[\r\n,;]+/).map((item) => item.trim()).filter(Boolean).map((item) => {
      const match = item.match(/^(.*?)\s+[—–-]\s+(Básico|Intermediário|Avançado|Especialista|Nível não informado)$/i);
      if (!match) return { name: item, level: "" };
      const level = normalize(match[2]) === "nivel nao informado"
        ? ""
        : PROFICIENCY_LEVELS.find((candidate) => normalize(candidate.value) === normalize(match[2]))?.value || "";
      return { name: match[1].trim(), level };
    });
  }

  function resumeTools(resume) {
    const entries = (resume.toolsEntries || []).map((entry) => ({ ...entry }));
    const knownNames = new Map(entries.map((entry, index) => [toolIdentity(entry.name), index]));
    const legacyEntries = parseLegacyTools(resume.tools || "");
    const inferredEntries = extractToolData(resume.skills || "").toolsEntries;
    for (const candidate of [...legacyEntries, ...inferredEntries]) {
      const identity = toolIdentity(candidate.name);
      const existingIndex = knownNames.get(identity);
      if (existingIndex === undefined) {
        knownNames.set(identity, entries.length);
        entries.push(candidate);
      } else if (!entries[existingIndex].level && candidate.level) {
        entries[existingIndex].level = candidate.level;
      }
    }
    return entries;
  }

  function resumeSkills(resume) {
    return removeToolsFromSkills(resume.skills || "");
  }

  function resumeToolReviewNotes(resume) {
    const inferredNotes = extractToolData(resume.skills || "").toolsReviewNotes;
    return [...new Set([resume.toolsReviewNotes, inferredNotes].filter(Boolean).flatMap((value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)))].join("\n");
  }

  function toolIdentity(name) {
    const normalizedName = normalize(name);
    const catalogTool = TOOL_CATALOG.find((tool) => toolAliases(tool).includes(normalizedName));
    return normalize(catalogTool?.name || name);
  }

  function formatResumeTools(entries) {
    return entries.map((entry) => `${entry.name}${entry.level ? ` — ${entry.level}` : " — Nível não informado"}`).join("\n");
  }

  function setPdfError(message) {
    const errorMessage = document.querySelector("#pdf-error");
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
  }

  function setPdfProgress(value, message) {
    document.querySelector("#pdf-progress").value = value;
    document.querySelector("#pdf-progress-label").textContent = message;
  }

  function formatFileSize(bytes) {
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function clearPdfDraft() {
    pdfInput.value = "";
    document.querySelector("#pdf-upload-status").hidden = true;
    document.querySelector("#pdf-file-name").textContent = "";
    document.querySelector("#pdf-file-size").textContent = "";
    setPdfProgress(0, "Aguardando leitura");
    setPdfError("");
  }

  async function loadPdfJs() {
    if (!pdfModulePromise) {
      pdfModulePromise = import(PDFJS_MODULE_URL).then((pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return pdfjsLib;
      }).catch((error) => {
        pdfModulePromise = null;
        throw new Error(`Não foi possível carregar o leitor PDF.js. Verifique sua conexão e tente novamente. ${error.message || ""}`);
      });
    }
    return pdfModulePromise;
  }

  function findPdfSectionHeading(line) {
    const sectionAliases = {
      contact: ["contato", "dados de contato", "dados pessoais", "dados pessoais e contato", "informacoes de contato", "informacoes pessoais", "contact"],
      summary: ["resumo", "resumo profissional", "perfil", "perfil profissional", "summary", "professional summary"],
      targetRole: ["cargo desejado", "objetivo", "objetivo profissional", "posicao desejada", "area de interesse", "target role"],
      currentRole: ["cargo atual", "funcao atual", "posicao atual", "current role"],
      level: ["nivel", "senioridade", "seniority"],
      experience: ["experiencia profissional", "experiencias profissionais", "experiencia", "experiencias", "historico profissional", "trajetoria profissional", "historico de trabalho", "professional experience", "experience", "work experience", "employment history"],
      education: ["formacao academica", "formacao", "educacao", "escolaridade", "education", "academic background", "academic qualifications"],
      courses: ["cursos", "cursos complementares", "courses"],
      certifications: ["cursos e certificacoes", "certificacoes e cursos", "certificacoes", "certificados", "certifications", "certifications and licenses", "licenses"],
      skills: ["competencias", "competencias profissionais", "competencias tecnicas", "habilidades", "habilidades profissionais", "skills", "professional skills", "conhecimentos tecnicos", "principais competencias", "qualificacoes"],
      tools: ["ferramentas", "ferramentas e softwares", "programas e ferramentas", "softwares", "software", "programas", "plataformas", "tecnologias e ferramentas", "tecnologias", "sistemas e ferramentas", "tools", "technologies"]
    };
    const trimmed = line.trim().replace(/^[•*\-\s]+/, "");
    const normalizedLine = normalize(trimmed).replace(/[:\s]+$/, "");
    for (const [section, aliases] of Object.entries(sectionAliases)) {
      if (aliases.includes(normalizedLine)) return { section, content: "" };
    }
    const separator = trimmed.search(/[:|–—-]/);
    if (separator < 0) return null;
    const heading = normalize(trimmed.slice(0, separator).replace(/[-\s]+$/, ""));
    for (const [section, aliases] of Object.entries(sectionAliases)) {
      if (aliases.includes(heading)) return { section, content: trimmed.slice(separator + 1).trim() };
    }
    return null;
  }

  function cleanPdfLine(line) {
    return line
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\uFEFF\uFFFD]/g, "")
      .replace(/[ \t\f\v]+/g, " ")
      .trim();
  }

  function organizePdfText(text) {
    const lines = text.split(/\r?\n/).map(cleanPdfLine).filter(Boolean);
    const sections = {
      contact: [],
      summary: [],
      targetRole: [],
      currentRole: [],
      level: [],
      experience: [],
      education: [],
      courses: [],
      certifications: [],
      skills: [],
      tools: [],
      other: []
    };
    const sectionTitles = {
      contact: "Dados de contato",
      summary: "Resumo",
      targetRole: "Cargo desejado",
      currentRole: "Cargo atual",
      level: "Nível profissional",
      experience: "Experiências",
      education: "Formação",
      courses: "Cursos",
      certifications: "Certificações",
      skills: "Competências",
      tools: "Ferramentas",
      other: "Outras informações"
    };
    let activeSection = "other";
    const detectedSections = new Set();

    for (const line of lines) {
      const heading = findPdfSectionHeading(line);
      if (heading) {
        activeSection = heading.section;
        detectedSections.add(activeSection);
        if (heading.content) sections[activeSection].push(cleanPdfLine(heading.content));
        continue;
      }
      if (line.includes(":") && !["contact", "experience"].includes(activeSection)) {
        activeSection = "other";
      }
      sections[activeSection].push(line);
    }

    const organized = Object.entries(sections)
      .filter(([, content]) => content.length > 0)
      .map(([section, content]) => `${sectionTitles[section]}\n${content.join("\n")}`)
      .join("\n\n");
    return {
      text: organized,
      safe: detectedSections.size > 0,
      sections: {
        skills: sections.skills.join("\n"),
        experience: sections.experience.join("\n"),
        education: sections.education.join("\n"),
        courses: sections.courses.join("\n"),
        certifications: sections.certifications.join("\n")
      }
    };
  }

  function sectionText(sections, name) {
    return (sections[name] || []).filter(Boolean).join("\n").trim();
  }

  function labeledValue(text, labels) {
    const labelPattern = labels.join("|");
    const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*[:|\\-–—]\\s*([^\\n]+)`, "i"));
    return match ? match[1].trim() : "";
  }

  function parseResumeExperiences(text) {
    const lines = text.split(/\r?\n/).map((line) => cleanPdfLine(line)).filter(Boolean);
    if (!lines.length) return [];
    const entries = [];
    let entry = null;
    const startEntry = () => ({ company: "", role: "", period: "", description: "" });
    const finishEntry = () => {
      if (entry && Object.values(entry).some(Boolean)) entries.push(entry);
      entry = null;
    };
    const periodPattern = /(?:19|20)\d{2}\s*(?:-|–|—|a|até|to)\s*(?:(?:19|20)\d{2}|atual|presente|hoje|current)/i;
    for (const line of lines) {
      const label = line.match(/^(empresa|company|cargo|fun[cç][aã]o|role|position|t[ií]tulo|title|per[ií]odo|period|datas?|descri[cç][aã]o|description)\s*[:|]\s*(.*)$/i);
      if (label) {
        const kind = normalize(label[1]);
        const value = label[2].trim();
        if ((kind === "empresa" || kind === "company") && entry?.company) finishEntry();
        if ((["cargo", "funcao", "role", "position", "titulo", "title"].includes(kind)) && entry?.role && entry?.company) finishEntry();
        entry ||= startEntry();
        if (kind === "empresa" || kind === "company") entry.company = value;
        else if (["cargo", "funcao", "role", "position", "titulo", "title"].includes(kind)) entry.role = value;
        else if (["periodo", "period", "data", "datas"].includes(kind)) entry.period = value;
        else entry.description = [entry.description, value].filter(Boolean).join("\n");
        continue;
      }
      const segments = line.split(/\s+[|]\s+|\s+—\s+/).map((segment) => segment.trim()).filter(Boolean);
      const periodIndex = segments.findIndex((segment) => periodPattern.test(segment));
      if (segments.length >= 3 && periodIndex >= 0) {
        finishEntry();
        entry = startEntry();
        entry.period = segments[periodIndex];
        const headerSegments = segments.filter((_, index) => index !== periodIndex);
        entry.role = headerSegments[0] || "";
        entry.company = headerSegments.slice(1).join(" | ");
        continue;
      }
      entry ||= startEntry();
      entry.description = [entry.description, line].filter(Boolean).join("\n");
    }
    finishEntry();
    return entries;
  }

  function extractResumeDraft(originalText) {
    const lines = originalText.split(/\r?\n/).map(cleanPdfLine).filter(Boolean);
    const sourceSections = {};
    let activeSection = "other";
    for (const line of lines) {
      const heading = findPdfSectionHeading(line);
      if (heading) {
        activeSection = heading.section;
        if (heading.content) (sourceSections[activeSection] ||= []).push(cleanPdfLine(heading.content));
      } else {
        (sourceSections[activeSection] ||= []).push(line);
      }
    }
    const getSection = (section) => sectionText(sourceSections, section);
    const contactSection = getSection("contact");
    const allText = lines.join("\n");
    const email = labeledValue(allText, ["e-?mail", "correio eletr[oô]nico"]) ||
      (allText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || "";
    const phonePattern = /(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]?\d{4}/g;
    const phone = labeledValue(allText, ["telefone", "celular", "phone", "whatsapp"]) ||
      (allText.match(phonePattern) || [])[0] || "";
    const linkedin = ((allText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;]+/i) || [])[0] || "").replace(/[).,;]+$/, "");
    const brazilianLocationPattern = /^[\p{L}][\p{L} .'-]{1,45}\s*(?:,|\/|-)\s*(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/iu;
    const location = labeledValue(allText, ["localiza[cç][aã]o", "cidade", "city", "endere[cç]o", "location"]) ||
      lines.find((line) => brazilianLocationPattern.test(line)) || "";
    const firstLine = lines[0] || "";
    const firstLineNormalized = normalize(firstLine);
    const name = labeledValue(allText, ["nome", "nome completo", "name"]) ||
      (!findPdfSectionHeading(firstLine) && firstLine !== firstLine.toLocaleUpperCase("pt-BR") &&
        !["curriculo", "curriculum vitae", "resume", "cv"].includes(firstLineNormalized) &&
        /^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,4}$/u.test(firstLine) ? firstLine : "");
    const currentRole = labeledValue(allText, ["cargo atual", "fun[cç][aã]o atual", "posi[cç][aã]o atual", "current role"]);
    const levelValue = labeledValue(allText, ["n[ií]vel", "senioridade", "seniority"]) || getSection("level");
    const knownLevels = ["Estágio", "Júnior", "Pleno", "Sênior", "Especialista", "Liderança"];
    const level = knownLevels.find((item) => normalize(item) === normalize(levelValue)) || "";
    const explicitExperienceRows = /(?:^|\n)\s*(?:empresa|company)\s*[:|]/i.test(allText);
    const delimitedExperienceRows = lines.some((line) => {
      const segments = line.split(/\s+[|]\s+|\s+—\s+/);
      return segments.length >= 3 && /(?:19|20)\d{2}\s*(?:-|–|—|a|até|to)\s*(?:(?:19|20)\d{2}|atual|presente|hoje|current)/i.test(line);
    });
    let experienceText = getSection("experience");
    if (!experienceText && (explicitExperienceRows || delimitedExperienceRows)) {
      const experienceStart = lines.findIndex((line) => /^(?:empresa|company)\s*[:|]/i.test(line) ||
        (line.split(/\s+[|]\s+|\s+—\s+/).length >= 3 && /(?:19|20)\d{2}\s*(?:-|–|—|a|até|to)\s*(?:(?:19|20)\d{2}|atual|presente|hoje|current)/i.test(line)));
      const remainingLines = lines.slice(experienceStart);
      const nextSectionIndex = remainingLines.slice(1).findIndex((line) => {
        const heading = findPdfSectionHeading(line);
        return heading && heading.section !== "experience";
      });
      experienceText = remainingLines.slice(0, nextSectionIndex < 0 ? undefined : nextSectionIndex + 1).join("\n");
    }
    const experiences = parseResumeExperiences(experienceText);
    const unsectionedExperienceLines = getSection("experience") ? new Set() : new Set(experienceText.split(/\r?\n/));
    const contactExtras = contactSection.split(/\r?\n/).filter((line) => {
      const value = line.trim();
      if (!value) return false;
      return !/^(nome(?: completo)?|name|e-?mail|correio eletr[oô]nico|telefone|celular|phone|whatsapp|localiza[cç][aã]o|cidade|city|endere[cç]o|location)\s*[:|]/i.test(value) &&
        ![name, email, phone, linkedin, location].some((known) => known && normalize(value).includes(normalize(known)));
    });
    const otherLines = (sourceSections.other || []).filter((line) =>
      !/^(nome(?: completo)?|name|e-?mail|correio eletr[oô]nico|telefone|celular|phone|whatsapp|localiza[cç][aã]o|cidade|city|endere[cç]o|location|cargo atual|fun[cç][aã]o atual|posi[cç][aã]o atual|n[ií]vel|senioridade|seniority)\s*[:|]/i.test(line) &&
      !unsectionedExperienceLines.has(line) &&
      ![name, email, phone, linkedin, location, currentRole, level].some((known) => known && normalize(line).includes(normalize(known))));
    const toolsData = extractToolData(originalText);
    const remainingToolsText = removeStandaloneProficiencyLines(removeToolsFromSkills(getSection("tools")));
    const extractedAny = [name, email, phone, linkedin, location, currentRole, level, getSection("summary"), getSection("experience"), getSection("education"), getSection("courses"), getSection("certifications"), getSection("skills"), getSection("tools")].some(Boolean);
    return {
      name,
      email,
      contact: [phone, linkedin].filter(Boolean).join("\n"),
      location,
      currentRole: currentRole || getSection("currentRole") || experiences.find((entry) => /atual|presente|current/i.test(entry.period))?.role || "",
      level,
      targetRole: getSection("targetRole"),
      summary: getSection("summary"),
      skills: removeToolsFromSkills(getSection("skills")),
      experienceEntries: experiences,
      experience: formatExperiences(experiences),
      education: getSection("education"),
      courses: getSection("courses"),
      certifications: getSection("certifications"),
      tools: remainingToolsText,
      toolsEntries: [...toolsData.toolsEntries, ...parseLegacyTools(remainingToolsText)],
      toolsReviewNotes: toolsData.toolsReviewNotes,
      otherInfo: [...otherLines, ...contactExtras].filter(Boolean).join("\n") || (!extractedAny ? originalText : ""),
      pdfText: originalText,
      pdfOrganizedText: ""
    };
  }

  function formatExperiences(entries) {
    return entries.map((entry) => {
      const heading = [entry.role, entry.company, entry.period].filter(Boolean).join(" | ");
      return [heading, entry.description].filter(Boolean).join("\n");
    }).filter(Boolean).join("\n\n");
  }

  function composeOrganizedResume(resume) {
    const sections = [
      ["Dados pessoais e contato", [resume.name, resume.email, resume.contact, resume.location, resume.currentRole && `Cargo atual: ${resume.currentRole}`, resume.level && `Nível profissional: ${resume.level}`].filter(Boolean).join("\n")],
      ["Resumo profissional", resume.summary],
      ["Cargo desejado", resume.targetRole],
      ["Experiências", formatExperiences(resume.experienceEntries || []) || resume.experience],
      ["Formação", resume.education],
      ["Cursos", resume.courses],
      ["Certificações", resume.certifications],
      ["Competências", resumeSkills(resume)],
      ["Ferramentas e softwares", formatResumeTools(resumeTools(resume)) || resume.tools],
      ["Revisar associação de proficiência", resumeToolReviewNotes(resume)],
      ["Outras informações", resume.otherInfo]
    ];
    return sections.filter(([, content]) => content && content.trim()).map(([title, content]) => `${title}\n${content.trim()}`).join("\n\n");
  }

  function pdfReadError(error, passwordCancelled) {
    if (passwordCancelled) return "Leitura cancelada. O currículo atual não foi alterado.";
    if (error?.name === "PasswordException") return "Este PDF está protegido por senha ou a senha informada está incorreta.";
    if (error?.name === "InvalidPDFException" || error?.name === "FormatError") return "O PDF está corrompido ou tem um formato inválido.";
    if (error?.name === "MissingPDFException") return "O arquivo PDF não pôde ser encontrado para leitura.";
    if (error?.message === "NO_EXTRACTABLE_TEXT") return "Não foi possível extrair texto deste PDF. Ele pode ser digitalizado como imagem; esta versão não inclui OCR.";
    return `Não foi possível ler este PDF. Ele pode estar corrompido ou usar um recurso não suportado. ${error?.message || ""}`.trim();
  }

  async function extractPdfText(file) {
    const pdfjsLib = await loadPdfJs();
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
    let passwordCancelled = false;
    loadingTask.onPassword = (updatePassword, reason) => {
      const incorrectPassword = reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD;
      const password = window.prompt(incorrectPassword ? "Senha incorreta. Tente novamente:" : "Este PDF está protegido. Digite a senha para continuar:");
      if (password === null) {
        passwordCancelled = true;
        loadingTask.destroy();
        return;
      }
      updatePassword(password);
    };
    try {
      const pdf = await loadingTask.promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = [];
        let currentLine = "";
        let previousY = null;
        for (const item of content.items) {
          if (typeof item.str !== "string" || !item.str.trim()) continue;
          const y = Array.isArray(item.transform) ? item.transform[5] : null;
          if (currentLine && typeof y === "number" && typeof previousY === "number" && Math.abs(y - previousY) > 2) {
            lines.push(currentLine.trim());
            currentLine = "";
          }
          currentLine += `${currentLine ? " " : ""}${item.str}`;
          if (typeof y === "number") previousY = y;
        }
        if (currentLine.trim()) lines.push(currentLine.trim());
        pages.push(lines.join("\n"));
        setPdfProgress(12 + Math.round(pageNumber / pdf.numPages * 83), `Lendo página ${pageNumber} de ${pdf.numPages}…`);
      }
      const extractedText = pages.join("\n\n").trim();
      if (!extractedText) {
        const error = new Error("NO_EXTRACTABLE_TEXT");
        error.name = "NoExtractableTextError";
        throw error;
      }
      return { text: extractedText, passwordCancelled };
    } catch (error) {
      error.passwordCancelled = passwordCancelled;
      throw error;
    } finally {
      await loadingTask.destroy();
    }
  }

  async function handlePdfFile(file) {
    if (pdfProcessing || !file) return;
    const uploadStatus = document.querySelector("#pdf-upload-status");
    uploadStatus.hidden = false;
    document.querySelector("#pdf-file-name").textContent = file.name;
    document.querySelector("#pdf-file-size").textContent = formatFileSize(file.size);
    setPdfProgress(0, "Aguardando leitura");
    setPdfError("");
    const isPdfName = file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf");
    const isPdfType = !file.type || file.type === "application/pdf";
    if (!isPdfName || !isPdfType) {
      setPdfProgress(0, "Arquivo rejeitado");
      setPdfError("Selecione um arquivo PDF válido (.pdf).");
      return;
    }
    if (file.size <= 0) {
      setPdfProgress(0, "Arquivo vazio");
      setPdfError("O arquivo está vazio. Selecione outro PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfProgress(0, "Arquivo acima do limite");
      setPdfError("O PDF excede o limite de 10 MB. Escolha um arquivo menor.");
      return;
    }

    pdfProcessing = true;
    document.querySelector("#pdf-select-button").disabled = true;
    setPdfProgress(5, "Carregando leitor PDF.js…");
    try {
      setPdfProgress(10, "Lendo arquivo localmente…");
      const result = await extractPdfText(file);
      openResumeReview(extractResumeDraft(result.text), "import");
      setPdfProgress(100, "Texto extraído. Revise antes de importar.");
      if (result.text.trim().length < 30) {
        setPdfError("Foi extraído pouco texto. Este PDF pode ser digitalizado como imagem e exigir OCR, que não está incluído.");
      }
    } catch (error) {
      console.error("Não foi possível extrair o texto do PDF.", error);
      setPdfProgress(0, "Falha ao ler o PDF");
      setPdfError(pdfReadError(error, error.passwordCancelled));
    } finally {
      pdfProcessing = false;
      document.querySelector("#pdf-select-button").disabled = false;
    }
  }

  function getMatch(job) {
    const pdfReference = composeOrganizedResume(data.resume) || data.resume.pdfOrganizedText || data.resume.pdfText;
    const experienceText = formatExperiences(data.resume.experienceEntries || []) || data.resume.experience;
    const resumeText = normalize([resumeSkills(data.resume), data.resume.summary, data.resume.currentRole, experienceText, data.resume.education, data.resume.courses, data.resume.certifications, formatResumeTools(resumeTools(data.resume)), data.resume.otherInfo, pdfReference].join(" "));
    const requirements = job.requirements.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
    const matched = requirements.filter((requirement) => resumeText.includes(normalize(requirement)));
    const criteria = [];
    if (requirements.length) criteria.push({ label: `Requisitos (70%): ${matched.length}/${requirements.length}`, score: matched.length / requirements.length, weight: 70 });
    if (job.level && data.resume.level) {
      const candidateRank = ["estagio", "junior", "pleno", "senior", "especialista", "lideranca"];
      const requested = candidateRank.indexOf(normalize(job.level));
      const candidate = candidateRank.indexOf(normalize(data.resume.level));
      const levelScore = requested < 0 || candidate < 0 ? (normalize(job.level) === normalize(data.resume.level) ? 1 : 0) : (candidate >= requested ? 1 : 0.5);
      criteria.push({ label: `Nível (20%): ${data.resume.level} / ${job.level}`, score: levelScore, weight: 20 });
    }
    if (job.location && data.resume.location) {
      const remote = normalize(job.location).includes("remot");
      const locationScore = remote || normalize(job.location).includes(normalize(data.resume.location)) || normalize(data.resume.location).includes(normalize(job.location)) ? 1 : 0;
      criteria.push({ label: `Local (10%): ${locationScore ? "compatível" : "diferente"}`, score: locationScore, weight: 10 });
    }
    const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
    const score = totalWeight ? Math.round(criteria.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight * 100) : null;
    return { requirements, matched, criteria, score };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function resumeSectionCard(section, title, body) {
    return `<article class="profile-card">
      <div class="profile-card-heading"><h3>${escapeHtml(title)}</h3><button class="button button-quiet" type="button" data-resume-edit="${escapeHtml(section)}">Editar</button></div>
      ${body || '<p class="profile-empty">Ainda não informado.</p>'}
    </article>`;
  }

  function profileTags(value) {
    const tags = value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
    return tags.length
      ? `<div class="profile-tags">${tags.map((tag) => `<span class="profile-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";
  }

  function profileToolTags(resume) {
    const entries = resumeTools(resume);
    return entries.length
      ? `<div class="profile-tags">${entries.map((entry) => `<span class="profile-tag">${escapeHtml(entry.name)} <span class="profile-tool-level">— ${escapeHtml(entry.level || "Nível não informado")}</span></span>`).join("")}</div>${resume.toolsReviewNotes ? `<p class="profile-tool-review"><strong>Revisar proficiência:</strong> ${escapeHtml(resume.toolsReviewNotes)}</p>` : ""}`
      : resume.toolsReviewNotes ? `<p class="profile-tool-review">${escapeHtml(resume.toolsReviewNotes)}</p>` : "";
  }

  function profileList(value) {
    const items = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    return items.length
      ? `<ul class="profile-compact-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "";
  }

  function renderResumeProfile() {
    const resume = data.resume;
    const contactValues = (resume.contact || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const contact = [
      resume.name && `<span class="profile-contact-item">${escapeHtml(resume.name)}</span>`,
      resume.email && `<span class="profile-contact-item">${escapeHtml(resume.email)}</span>`,
      ...contactValues.map((value) => `<span class="profile-contact-item">${escapeHtml(value)}</span>`),
      resume.location && `<span class="profile-contact-item">${escapeHtml(resume.location)}</span>`
    ].filter(Boolean).join("");
    const experiences = resume.experienceEntries?.length
      ? resume.experienceEntries
      : resume.experience.trim() ? [{ company: "", role: "", period: "", description: resume.experience }] : [];
    const experienceCards = experiences.map((entry, index) => ({ entry, index, periodRank: experiencePeriodRank(entry.period) }))
      .sort((left, right) => {
        if (left.periodRank === null && right.periodRank === null) return left.index - right.index;
        if (left.periodRank === null) return 1;
        if (right.periodRank === null) return -1;
        return right.periodRank - left.periodRank || left.index - right.index;
      })
      .map(({ entry, index }) => {
        const description = entry.description || "";
        const activityLines = description.split(/\r?\n/);
        const activities = activityLines.length > 1
          ? `<ul class="profile-experience-activities">${activityLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
          : `<p class="profile-card-body">${escapeHtml(description)}</p>`;
        const activityContent = description
          ? `<section class="profile-experience-activities-section" aria-label="Principais atividades"><h4>Principais atividades</h4>${activities}</section>`
          : "";
        const needsDescriptionExpansion = description.length > 220 || activityLines.length > 3;
        const preview = description.length > 220
          ? `${description.slice(0, 220).trimEnd()}…`
          : `${activityLines.slice(0, 3).join("\n")}…`;
        const descriptionDetails = needsDescriptionExpansion
          ? `<p class="profile-experience-preview">${escapeHtml(preview)}</p><details class="profile-experience-details"><summary>Ver descrição completa</summary><div class="profile-experience-full">${activityContent}</div></details>`
          : activityContent;
        return `<article class="profile-experience">
          <div class="profile-experience-heading">
            <div>${entry.role ? `<strong>${escapeHtml(entry.role)}</strong>` : ""}${entry.company ? `<span class="profile-experience-company">${escapeHtml(entry.company)}</span>` : ""}</div>
            ${entry.period ? `<span class="profile-experience-meta">${escapeHtml(entry.period)}</span>` : ""}
          </div>
          ${descriptionDetails}
          <button class="button button-outline profile-experience-edit" type="button" data-resume-edit-experience="${index}">Editar experiência</button>
        </article>`;
    }).join("");
    const summaryBody = resume.summary
      ? `<p class="profile-card-body profile-summary-text">${escapeHtml(resume.summary)}</p>${resume.summary.length > 150 ? '<button class="profile-expand-button" type="button" data-summary-expand aria-expanded="false">Ver mais</button>' : ""}`
      : "";
    const targetBody = [
      resume.currentRole && `Cargo atual: ${resume.currentRole}`,
      resume.targetRole && `Cargo desejado: ${resume.targetRole}`,
      resume.level && `Nível: ${resume.level}`
    ].filter(Boolean).map(escapeHtml).join(" · ");
    const experienceBody = experienceCards ? `<div class="profile-experience-list">${experienceCards}</div>` : "";
    const educationBody = profileList(resume.education);
    const cards = [
      resumeSectionCard("personal", "Dados pessoais e contato", contact ? `<div class="profile-contact-grid">${contact}</div>` : ""),
      resumeSectionCard("summary", "Resumo profissional", summaryBody),
      resumeSectionCard("targetRole", "Cargos e nível profissional", targetBody ? `<p class="profile-card-body">${targetBody}</p>` : ""),
      resumeSectionCard("education", "Formação", educationBody),
      resumeSectionCard("courses", "Cursos", profileList(resume.courses)),
      resumeSectionCard("certifications", "Certificações", profileList(resume.certifications)),
      resumeSectionCard("skills", "Competências profissionais", profileTags(resumeSkills(resume))),
      resumeSectionCard("tools", "Ferramentas e softwares", profileToolTags(resume)),
      resumeSectionCard("otherInfo", "Outras informações", resume.otherInfo ? `<p class="profile-card-body">${escapeHtml(resume.otherInfo)}</p>` : "")
    ];
    const pages = [
      { title: "Informações pessoais", cards: [cards[0], cards[1], cards[2]] },
      { title: "Formação e habilidades", cards: cards.slice(3, 9) },
      { title: "Experiências profissionais", cards: [resumeSectionCard("experience", "Experiências", experienceBody)] }
    ];
    const pageMarkup = pages.map((page, index) => `<div class="resume-profile-page" data-profile-page="${index}" aria-labelledby="resume-profile-page-title-${index}"${index === currentProfilePage ? "" : " hidden"}>
      <h4 class="resume-profile-page-title" id="resume-profile-page-title-${index}">${escapeHtml(page.title)}</h4>
      ${page.cards.join("")}
    </div>`).join("");
    resumeProfileView.innerHTML = `<div class="profile-view-heading"><div><p class="eyebrow">PERFIL ORGANIZADO</p><h3>${escapeHtml(resume.name || "Seu currículo")}</h3></div><div class="profile-view-actions"><button class="button button-outline" type="button" data-resume-import>Importar outro currículo</button><button class="button button-primary" type="button" data-resume-edit="all">Editar perfil</button></div></div><div class="resume-profile-pages" aria-live="polite">${pageMarkup}</div><nav class="resume-profile-navigation" aria-label="Navegação das páginas do currículo"><button class="button button-quiet" type="button" data-profile-previous aria-label="Página anterior" ${currentProfilePage === 0 ? "disabled" : ""}>←</button><span data-profile-page-indicator>${currentProfilePage + 1} de 3</span><button class="button button-quiet" type="button" data-profile-next aria-label="Próxima página" ${currentProfilePage === 2 ? "disabled" : ""}>→</button></nav>`;
    resumeProfileView.querySelectorAll("[data-resume-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.dataset.resumeEdit;
        openResumeReview(data.resume, "edit", section);
      });
    });
    resumeProfileView.querySelectorAll("[data-resume-edit-experience]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.resumeEditExperience);
        openResumeReview(data.resume, "edit", "experience");
        resumeExperienceEditor
          .querySelector(`[data-experience-index="${index}"] [name="experience-role"]`)
          ?.focus();
      });
    });
    resumeProfileView.querySelectorAll(".profile-experience-details").forEach((details) => {
      details.addEventListener("toggle", () => {
        details.querySelector("summary").textContent = details.open ? "Recolher descrição" : "Ver descrição completa";
      });
    });
    resumeProfileView.querySelector("[data-resume-import]").addEventListener("click", () => {
      document.querySelector(".pdf-import-details").open = true;
      pdfInput.click();
    });
    resumeProfileView.querySelector("[data-profile-previous]").addEventListener("click", () => setProfilePage(currentProfilePage - 1));
    resumeProfileView.querySelector("[data-profile-next]").addEventListener("click", () => setProfilePage(currentProfilePage + 1));
    const summaryExpandButton = resumeProfileView.querySelector("[data-summary-expand]");
    if (summaryExpandButton) {
      summaryExpandButton.addEventListener("click", () => {
        const summaryText = resumeProfileView.querySelector(".profile-summary-text");
        const expanded = summaryText.classList.toggle("expanded");
        summaryExpandButton.textContent = expanded ? "Ver menos" : "Ver mais";
        summaryExpandButton.setAttribute("aria-expanded", String(expanded));
      });
    }

    function experiencePeriodRank(period) {
      if (!period) return null;
      if (/\b(atual|presente|current|present)\b/i.test(period)) return Number.POSITIVE_INFINITY;
      const years = [...period.matchAll(/\b(?:19|20)\d{2}\b/g)].map(([year]) => Number(year));
      return years.length ? years[years.length - 1] : null;
    }
  }

  function setProfilePage(pageIndex) {
    currentProfilePage = Math.max(0, Math.min(2, pageIndex));
    resumeProfileView.querySelectorAll("[data-profile-page]").forEach((page) => {
      page.hidden = Number(page.dataset.profilePage) !== currentProfilePage;
    });
    resumeProfileView.querySelector("[data-profile-page-indicator]").textContent = `${currentProfilePage + 1} de 3`;
    resumeProfileView.querySelector("[data-profile-previous]").disabled = currentProfilePage === 0;
    resumeProfileView.querySelector("[data-profile-next]").disabled = currentProfilePage === 2;
  }

  function renderResumeExperienceEditor(entries) {
    const experienceEntries = entries.length ? entries : [];
    if (!experienceEntries.length) {
      resumeExperienceEditor.innerHTML = '<p class="experience-empty">Nenhuma experiência identificada. Você pode adicionar uma e preencher apenas os dados conhecidos.</p>';
      return;
    }
    resumeExperienceEditor.innerHTML = experienceEntries.map((entry, index) => `<article class="resume-experience-editor-card" data-experience-index="${index}">
      <div class="form-grid">
        <label>Empresa<input name="experience-company" value="${escapeHtml(entry.company || "")}" autocomplete="organization"></label>
        <label>Cargo<input name="experience-role" value="${escapeHtml(entry.role || "")}" autocomplete="organization-title"></label>
        <label>Período<input name="experience-period" value="${escapeHtml(entry.period || "")}" placeholder="Ex.: 2020–2023"></label>
      </div>
      <label>Descrição<textarea name="experience-description" rows="3">${escapeHtml(entry.description || "")}</textarea></label>
      <button class="button button-quiet" type="button" data-remove-experience="${index}" aria-label="Excluir experiência ${index + 1}">Excluir experiência</button>
    </article>`).join("");
    resumeExperienceEditor.querySelectorAll("[data-remove-experience]").forEach((button) => {
      button.addEventListener("click", () => {
        const entriesNow = readResumeExperienceEditor();
        entriesNow.splice(Number(button.dataset.removeExperience), 1);
        renderResumeExperienceEditor(entriesNow);
      });
    });
  }

  function readResumeExperienceEditor() {
    return [...resumeExperienceEditor.querySelectorAll(".resume-experience-editor-card")].map((card) => ({
      company: card.querySelector('[name="experience-company"]').value.trim(),
      role: card.querySelector('[name="experience-role"]').value.trim(),
      period: card.querySelector('[name="experience-period"]').value.trim(),
      description: card.querySelector('[name="experience-description"]').value.trim()
    })).filter((entry) => Object.values(entry).some(Boolean));
  }

  function renderResumeToolsEditor(entries) {
    const tools = entries.length ? entries : [];
    if (!tools.length) {
      resumeToolsEditor.innerHTML = '<p class="experience-empty">Nenhuma ferramenta identificada. Adicione somente os softwares mencionados no currículo.</p>';
      return;
    }
    const levelOptions = ["", ...PROFICIENCY_LEVELS.map((level) => level.value)];
    resumeToolsEditor.innerHTML = tools.map((tool, index) => `<article class="resume-tool-editor-card" data-tool-index="${index}">
      <label>Nome da ferramenta ou software
        <input name="tool-name" value="${escapeHtml(tool.name)}" aria-label="Nome da ferramenta ${index + 1}">
      </label>
      <label>Nível de proficiência
        <select name="tool-level" aria-label="Nível da ferramenta ${index + 1}">
          ${tool.level && !levelOptions.includes(tool.level) ? `<option value="${escapeHtml(tool.level)}" selected>${escapeHtml(tool.level)} (nível personalizado)</option>` : ""}
          ${levelOptions.map((level) => `<option value="${escapeHtml(level)}"${tool.level === level ? " selected" : ""}>${escapeHtml(level || "Nível não informado")}</option>`).join("")}
        </select>
      </label>
      <button class="button button-quiet" type="button" data-remove-tool="${index}" aria-label="Remover ferramenta ${index + 1}">Remover ferramenta</button>
    </article>`).join("");
    resumeToolsEditor.querySelectorAll("[data-remove-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        const entriesNow = readResumeToolsEditor();
        entriesNow.splice(Number(button.dataset.removeTool), 1);
        renderResumeToolsEditor(entriesNow);
      });
    });
  }

  function readResumeToolsEditor() {
    return [...resumeToolsEditor.querySelectorAll(".resume-tool-editor-card")].map((card) => ({
      name: card.querySelector('[name="tool-name"]').value.trim(),
      level: card.querySelector('[name="tool-level"]').value
    })).filter((entry) => entry.name);
  }

  function openResumeReview(resume, mode, focusSection = "") {
    reviewMode = mode;
    currentOriginalPdfText = resume.pdfText || "";
    resumeReviewForm.reset();
    for (const field of ["name", "email", "location", "currentRole", "level", "targetRole", "summary", "education", "courses", "certifications", "skills", "toolsReviewNotes", "otherInfo"]) {
      resumeReviewForm.elements.namedItem(field).value = resume[field] || "";
    }
    resumeReviewForm.elements.namedItem("skills").value = resumeSkills(resume);
    resumeReviewForm.elements.namedItem("toolsReviewNotes").value = resumeToolReviewNotes(resume);
    renderResumeToolsEditor(resumeTools(resume));
    const contactLines = (resume.contact || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const linkedin = contactLines.find((line) => /linkedin\.com\//i.test(line)) || "";
    const phone = contactLines.find((line) => /(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]?\d{4}/.test(line)) ||
      contactLines.find((line) => line !== linkedin) || "";
    resumeReviewForm.elements.namedItem("phone").value = phone;
    resumeReviewForm.elements.namedItem("linkedin").value = linkedin;
    const experienceEntries = resume.experienceEntries?.length
      ? resume.experienceEntries
      : parseResumeExperiences(resume.experience || "");
    renderResumeExperienceEditor(experienceEntries);
    document.querySelector("#resume-original-pdf-text").textContent = currentOriginalPdfText || "Nenhum texto original de PDF salvo.";
    document.querySelector("#resume-review-title").textContent = mode === "import" ? "Revise seu currículo" : "Editar currículo";
    document.querySelector("#resume-review-eyebrow").textContent = mode === "import" ? "CURRÍCULO IMPORTADO" : "EDITAR PERFIL";
    document.querySelector("#resume-review-intro").textContent = mode === "import"
      ? "Confira os dados identificados. Somente o que foi encontrado está preenchido; nada será salvo antes da confirmação."
      : "Edite os dados do seu perfil. As alterações só serão salvas quando você confirmar.";
    document.querySelector("#save-resume-review").textContent = mode === "import" ? "Confirmar e salvar currículo" : "Salvar alterações";
    setResumeReviewPage(0);
    resumeReviewDialog.showModal();
    if (focusSection) {
      const focusTarget = {
        personal: '[name="name"]',
        summary: '[name="summary"]',
        targetRole: '[name="targetRole"]',
        currentRole: '[name="currentRole"]',
        experience: "#add-resume-experience",
        education: '[name="education"]',
        courses: '[name="courses"]',
        certifications: '[name="certifications"]',
        skills: '[name="skills"]',
        tools: "#add-resume-tool",
        toolsReviewNotes: '[name="toolsReviewNotes"]',
        otherInfo: '[name="otherInfo"]',
        all: '[name="name"]'
      }[focusSection] || '[name="name"]';
      const target = resumeReviewForm.querySelector(focusTarget);
      const pageIndex = Number(target?.closest("[data-review-page]")?.dataset.reviewPage || 0);
      setResumeReviewPage(pageIndex);
      target?.focus();
    } else {
      resumeReviewForm.querySelector('[name="name"]').focus();
    }
  }

  function setResumeReviewPage(pageIndex, moveFocus = false) {
    currentReviewPage = Math.max(0, Math.min(2, pageIndex));
    const pageNames = ["Informações pessoais", "Informações acadêmicas, habilidades e competências", "Experiências profissionais"];
    resumeReviewForm.querySelectorAll("[data-review-page]").forEach((page) => {
      page.hidden = Number(page.dataset.reviewPage) !== currentReviewPage;
    });
    document.querySelector("#resume-review-step-status").textContent = `Etapa ${currentReviewPage + 1} de 3: ${pageNames[currentReviewPage]}`;
    document.querySelector("#previous-resume-review-page").disabled = currentReviewPage === 0;
    document.querySelector("#next-resume-review-page").hidden = currentReviewPage === 2;
    document.querySelector("#save-resume-review").hidden = currentReviewPage !== 2;
    if (moveFocus) {
      const currentPage = resumeReviewForm.querySelector(`[data-review-page="${currentReviewPage}"]`);
      const heading = currentPage.querySelector("h3");
      heading?.focus();
      currentPage.scrollTop = 0;
    }
  }

  function saveResumeReview() {
    const formValues = new FormData(resumeReviewForm);
    const experienceEntries = readResumeExperienceEditor();
    const toolsEntries = readResumeToolsEditor();
    const resume = {
      name: String(formValues.get("name") || "").trim(),
      email: String(formValues.get("email") || "").trim(),
      contact: [formValues.get("phone"), formValues.get("linkedin")].map((value) => String(value || "").trim()).filter(Boolean).join("\n"),
      location: String(formValues.get("location") || "").trim(),
      currentRole: String(formValues.get("currentRole") || "").trim(),
      level: String(formValues.get("level") || ""),
      targetRole: String(formValues.get("targetRole") || "").trim(),
      summary: String(formValues.get("summary") || "").trim(),
      skills: String(formValues.get("skills") || "").trim(),
      experienceEntries,
      experience: formatExperiences(experienceEntries),
      education: String(formValues.get("education") || "").trim(),
      courses: String(formValues.get("courses") || "").trim(),
      certifications: String(formValues.get("certifications") || "").trim(),
      tools: formatResumeTools(toolsEntries),
      toolsEntries,
      toolsReviewNotes: String(formValues.get("toolsReviewNotes") || "").trim(),
      otherInfo: String(formValues.get("otherInfo") || "").trim(),
      pdfText: reviewMode === "import" ? currentOriginalPdfText : data.resume.pdfText,
      pdfOrganizedText: ""
    };
    resume.pdfOrganizedText = composeOrganizedResume(resume);
    if (!resume.pdfOrganizedText) resume.pdfOrganizedText = resume.pdfText || currentOriginalPdfText;
    const previousData = data;
    data = { ...data, resume };
    if (!saveData()) {
      data = previousData;
      return false;
    }
    fillResumeForm();
    renderJobs();
    renderResumeProfile();
    resumeReviewDialog.close();
    if (reviewMode === "import") clearPdfDraft();
    showToast(reviewMode === "import" ? "Currículo importado e salvo neste dispositivo." : "Perfil atualizado neste dispositivo.");
    return true;
  }

  function renderFullResume() {
    const resume = data.resume;
    const section = (title, content) => `<section class="full-resume-section"><h3>${escapeHtml(title)}</h3>${content || "<p>Não informado.</p>"}</section>`;
    const experiences = resume.experienceEntries?.length
      ? resume.experienceEntries
      : resume.experience.trim() ? [{ company: "", role: "", period: "", description: resume.experience }] : [];
    const experienceHtml = experiences.length
      ? experiences.map((entry) => `<article class="full-resume-experience"><strong>${escapeHtml([entry.role, entry.company].filter(Boolean).join(" — ") || "Experiência profissional")}</strong>${entry.period ? `<span>${escapeHtml(entry.period)}</span>` : ""}${entry.description ? `<p>${escapeHtml(entry.description)}</p>` : ""}</article>`).join("")
      : "<p>Não informado.</p>";
    const contact = [resume.name, resume.email, resume.contact, resume.location].filter(Boolean).map(escapeHtml).join("\n");
    const content = [
      section("Dados pessoais e contato", contact ? `<p>${contact}</p>` : ""),
      section("Resumo profissional", resume.summary ? `<p>${escapeHtml(resume.summary)}</p>` : ""),
      section("Cargo atual, desejado e nível", [resume.currentRole && `Cargo atual: ${resume.currentRole}`, resume.targetRole && `Cargo desejado: ${resume.targetRole}`, resume.level && `Nível: ${resume.level}`].filter(Boolean).length ? `<p>${escapeHtml([resume.currentRole && `Cargo atual: ${resume.currentRole}`, resume.targetRole && `Cargo desejado: ${resume.targetRole}`, resume.level && `Nível: ${resume.level}`].filter(Boolean).join("\n"))}</p>` : ""),
      section("Experiências", experienceHtml),
      section("Formação", resume.education ? `<p>${escapeHtml(resume.education)}</p>` : ""),
      section("Cursos", resume.courses ? `<p>${escapeHtml(resume.courses)}</p>` : ""),
      section("Certificações", resume.certifications ? `<p>${escapeHtml(resume.certifications)}</p>` : ""),
      section("Competências profissionais", resumeSkills(resume) ? `<p>${escapeHtml(resumeSkills(resume))}</p>` : ""),
      section("Ferramentas e softwares", formatResumeTools(resumeTools(resume)) ? `<p>${escapeHtml(formatResumeTools(resumeTools(resume)))}</p>` : ""),
      section("Revisar associação de proficiência", resumeToolReviewNotes(resume) ? `<p>${escapeHtml(resumeToolReviewNotes(resume))}</p>` : ""),
      section("Outras informações", resume.otherInfo ? `<p>${escapeHtml(resume.otherInfo)}</p>` : ""),
      section("Versão organizada salva", (composeOrganizedResume(resume) || resume.pdfOrganizedText) ? `<p>${escapeHtml(composeOrganizedResume(resume) || resume.pdfOrganizedText)}</p>` : ""),
      section("Texto original extraído do PDF", resume.pdfText ? `<p>${escapeHtml(resume.pdfText)}</p>` : "")
    ];
    document.querySelector("#full-resume-content").innerHTML = content.join("");
  }

  function clearResumeProfile() {
    const confirmed = window.confirm("Limpar o perfil profissional? Serão removidos os dados do currículo, experiências, competências, formação, cursos, ferramentas e textos original/organizado de PDF deste dispositivo. Vagas, candidaturas e demais dados não serão apagados. Esta ação não pode ser desfeita sem um backup. Continuar?");
    if (!confirmed) return;
    const previousData = data;
    data = { ...data, resume: emptyData().resume };
    if (!saveData()) {
      data = previousData;
      return;
    }
    window.clearTimeout(saveTimer);
    fillResumeForm();
    renderJobs();
    renderResumeProfile();
    document.querySelector("#save-message").textContent = "Perfil limpo neste navegador.";
    showToast("Perfil e textos do currículo removidos. Vagas e candidaturas foram mantidas.");
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function apiText(value) {
    if (typeof value !== "string") return "";
    return new DOMParser().parseFromString(value, "text/html").body.textContent.replace(/\s+/g, " ").trim();
  }

  function listText(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object") return textValue(value.name || value.label || value.value).trim();
      return "";
    }).filter(Boolean))];
  }

  function jobTerms(value) {
    if (Array.isArray(value)) return listText(value);
    return typeof value === "string"
      ? [...new Set(value.split(/[\n,;•]+/).map((item) => item.trim()).filter(Boolean))]
      : [];
  }

  function extractEducationRequirements(description, explicitRequirements = []) {
    const explicit = jobTerms(explicitRequirements);
    const educationTerms = /\b(bachelor|bachelor's|master|master's|degree|diploma|graduation|graduate|education|academic|bacharel|bacharelado|mestrado|gradua[cç][aã]o|diploma|formação|formacao|ensino superior)\b/i;
    const sentences = apiText(description).split(/(?<=[.!?])\s+|\n+/).map((item) => item.trim()).filter(Boolean);
    return [...new Set([...explicit, ...sentences.filter((sentence) => educationTerms.test(sentence))])];
  }

  function dateValue(value, unixSeconds = false) {
    if (typeof value === "number" && Number.isFinite(value)) {
      const date = new Date(unixSeconds ? value * 1000 : value);
      return Number.isNaN(date.getTime()) ? "" : date.toISOString();
    }
    if (typeof value !== "string" || !value.trim()) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function salaryText(minimum, maximum, currency, period) {
    if (!Number.isFinite(minimum) && !Number.isFinite(maximum)) return "";
    const amount = [minimum, maximum].filter(Number.isFinite).map((value) => new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 0
    }).format(value));
    const range = amount.length === 2 ? `${amount[0]}–${amount[1]}` : amount[0];
    return [currency, range, period].filter(Boolean).join(" ");
  }

  function normalizeArrangement(value) {
    const arrangement = normalize(textValue(value));
    if (/remote|remot|worldwide|fully remote/.test(arrangement)) return "remote";
    if (/hybrid|hibrid/.test(arrangement)) return "hybrid";
    if (/onsite|on-site|presencial|office/.test(arrangement)) return "onsite";
    return "";
  }

  function normalizeSeniority(value) {
    const seniority = normalize(textValue(value));
    if (/intern|estag/.test(seniority)) return "estagio";
    if (/junior|entry|associate/.test(seniority)) return "junior";
    if (/mid|intermedi/.test(seniority)) return "mid";
    if (/senior|sr\.?/.test(seniority)) return "senior";
    if (/lead|principal|director|head/.test(seniority)) return "lead";
    return "";
  }

  function seniorityLabel(value) {
    const labels = { estagio: "Estágio", junior: "Júnior", mid: "Pleno / intermediário", senior: "Sênior", lead: "Liderança" };
    return labels[normalizeSeniority(value)] || textValue(value);
  }

  function normalizeHimalayasJob(job, eligibleCountry = "") {
    if (!job || typeof job !== "object" || typeof job.title !== "string") return null;
    const applicationUrl = textValue(job.applicationLink).trim();
    if (!safeUrl(applicationUrl)) return null;
    const restrictions = listText(job.locationRestrictions);
    const categories = [...listText(job.categories), ...listText(job.parentCategories)];
    return {
      id: textValue(job.guid) || applicationUrl,
      title: job.title,
      company: textValue(job.companyName),
      description: apiText(job.description || job.excerpt),
      requirements: jobTerms(job.requirements),
      skills: jobTerms(job.skills),
      tools: jobTerms(job.tools),
      stack: jobTerms(job.stack),
      categories,
      educationRequirements: extractEducationRequirements(job.description || job.excerpt, job.educationRequirements || job.education_requirements),
      location: restrictions.length ? restrictions.join(", ") : "Remoto — sem restrição de país informada",
      locationDisplay: restrictions.length > 5 ? `${restrictions.slice(0, 4).join(", ")} e outros ${restrictions.length - 4} países` : restrictions.join(", "),
      locationTerms: restrictions,
      locationCountries: restrictions,
      eligibleCountries: eligibleCountry ? [eligibleCountry] : [],
      arrangement: "remote",
      seniority: textValue(job.seniority),
      level: normalizeSeniority(job.seniority),
      contractType: textValue(job.employmentType),
      salary: salaryText(job.minSalary, job.maxSalary, textValue(job.currency), textValue(job.salaryPeriod)),
      salaryMinimum: Number.isFinite(job.minSalary) ? job.minSalary : null,
      salaryMaximum: Number.isFinite(job.maxSalary) ? job.maxSalary : null,
      salaryCurrency: textValue(job.currency),
      salaryPeriod: textValue(job.salaryPeriod),
      postedAt: dateValue(job.pubDate, true),
      expiresAt: dateValue(job.expiryDate, true),
      url: applicationUrl,
      sourceId: "himalayas",
      sourceName: "Himalayas",
      sourceLinks: [{ name: "Himalayas", url: applicationUrl }],
      mandatoryRequirements: jobTerms(job.requiredSkills || job.required_skills)
    };
  }

  function normalizeFourDayWeekJob(job, eligibleCountry = "") {
    if (!job || typeof job !== "object" || typeof job.title !== "string") return null;
    const jobUrl = textValue(job.url).trim();
    if (!safeUrl(jobUrl)) return null;
    const locations = Array.isArray(job.locations) ? job.locations.map((location) => [
      textValue(location.city),
      textValue(location.state),
      textValue(location.country)
    ].filter(Boolean).join(", ")).filter(Boolean) : [];
    const company = job.company && typeof job.company === "object" ? textValue(job.company.name) : "";
    const locationCountries = Array.isArray(job.locations)
      ? [...new Set(job.locations.map((location) => textValue(location.country).trim()).filter(Boolean))]
      : [];
    const arrangement = normalizeArrangement(job.work_arrangement || job.locations?.[0]?.work_arrangement);
    const salary = salaryText(job.salary_min, job.salary_max, textValue(job.salary_currency), textValue(job.salary_period));
    return {
      id: textValue(job.id || job.slug) || jobUrl,
      title: job.title,
      company,
      description: apiText(job.description || job.short_description),
      requirements: jobTerms(job.requirements),
      skills: jobTerms(job.skills),
      tools: jobTerms(job.tools),
      stack: jobTerms(job.stack),
      categories: jobTerms(job.category),
      educationRequirements: extractEducationRequirements(job.description, job.education_requirements || job.educationRequirements),
      location: locations.join(" · "),
      locationTerms: locations,
      locationCountries,
      eligibleCountries: eligibleCountry ? [eligibleCountry] : [],
      arrangement,
      seniority: textValue(job.level),
      level: normalizeSeniority(job.level),
      contractType: textValue(job.contract_type),
      salary,
      salaryMinimum: Number.isFinite(job.salary_min) ? job.salary_min : null,
      salaryMaximum: Number.isFinite(job.salary_max) ? job.salary_max : null,
      salaryCurrency: textValue(job.salary_currency),
      salaryPeriod: textValue(job.salary_period),
      postedAt: dateValue(job.posted_at),
      expiresAt: dateValue(job.expires_at),
      url: jobUrl,
      sourceId: "4dayweek",
      sourceName: "4dayweek.io",
      sourceLinks: [{ name: "4dayweek.io", url: jobUrl }],
      mandatoryRequirements: jobTerms(job.required_skills || job.requiredSkills)
    };
  }

  function getOpportunityGeography(job) {
    const locationTerms = Array.isArray(job.locationTerms) ? job.locationTerms : [];
    const inferredCountries = job.sourceId === "himalayas"
      ? locationTerms
      : locationTerms.map((term) => term.includes(",") ? term.split(",").pop() : "");
    const rawCountries = Array.isArray(job.locationCountries) && job.locationCountries.length
      ? job.locationCountries
      : inferredCountries;
    const countryNames = rawCountries.map(normalize);
    const eligibleCountries = (job.eligibleCountries || []).map(normalize);
    const locationText = normalize([job.location, ...locationTerms].join(" "));
    const allowsBrazil = countryNames.includes("brazil") || countryNames.includes("brasil")
      || /\b(brazil|brasil)\b/.test(locationText);
    const hasCountryRestrictions = countryNames.length > 0;
    const worldwide = /\b(worldwide|global|anywhere|world wide)\b/.test(locationText);
    const remote = job.arrangement === "remote";

    if (allowsBrazil) {
      return remote && countryNames.some((country) => country !== "brazil" && country !== "brasil")
        ? { status: "remote-brazil", rank: 1, label: "Remota · aceita Brasil", acceptsBrazil: true }
        : { status: "brazil", rank: 0, label: "Localidade no Brasil", acceptsBrazil: true };
    }
    if (remote && eligibleCountries.includes("brazil")) {
      return { status: "remote-brazil", rank: 1, label: "Remota · elegível no Brasil segundo a fonte", acceptsBrazil: true };
    }
    if (remote && worldwide) {
      return { status: "remote-brazil", rank: 1, label: "Remota · alcance global informado", acceptsBrazil: true };
    }
    if (hasCountryRestrictions) {
      return { status: "international", rank: 3, label: "Internacional · Brasil não consta entre os países permitidos", acceptsBrazil: false };
    }
    return { status: "unknown", rank: 2, label: "Elegibilidade no Brasil a confirmar", acceptsBrazil: false };
  }

  function isJobExpired(job, now = Date.now()) {
    const expiresAt = Date.parse(job.expiresAt || "");
    return Number.isFinite(expiresAt) && expiresAt <= now;
  }

  function jobCanonicalUrl(value) {
    try {
      const url = new URL(value);
      url.hash = "";
      url.search = "";
      url.pathname = url.pathname.replace(/\/+$/, "");
      return url.href.toLocaleLowerCase("en-US");
    } catch {
      return "";
    }
  }

  function jobDuplicateFingerprint(job) {
    if (!job.company || !job.title || !job.location || !job.postedAt) return "";
    const description = normalize(job.description);
    if (description.length < 80) return "";
    return [
      normalize(job.company),
      normalize(job.title),
      normalize(job.location),
      new Date(job.postedAt).toISOString().slice(0, 10),
      description
    ].join("|");
  }

  function deduplicateOpportunities(jobs) {
    const records = [];
    const bySourceId = new Map();
    const byCanonicalUrl = new Map();
    const byFingerprint = new Map();
    for (const job of jobs) {
      const canonical = jobCanonicalUrl(job.url);
      const identity = `${job.sourceId}:${job.id}`;
      const fingerprint = jobDuplicateFingerprint(job);
      const fingerprintRecord = fingerprint && byFingerprint.get(fingerprint);
      const existing = bySourceId.get(identity)
        || (canonical && byCanonicalUrl.get(canonical))
        || (fingerprintRecord && !fingerprintRecord.sourceLinks.some((link) => link.name === job.sourceName) ? fingerprintRecord : null);
      if (!existing) {
        const record = { ...job, sourceLinks: [...job.sourceLinks] };
        records.push(record);
        bySourceId.set(identity, record);
        if (canonical) byCanonicalUrl.set(canonical, record);
        if (fingerprint) byFingerprint.set(fingerprint, record);
        continue;
      }
      existing.sourceLinks = [...existing.sourceLinks, ...job.sourceLinks.filter((link) =>
        !existing.sourceLinks.some((existingLink) => existingLink.name === link.name && existingLink.url === link.url))];
      existing.skills = [...new Set([...existing.skills, ...job.skills])];
      existing.tools = [...new Set([...existing.tools, ...job.tools])];
      existing.stack = [...new Set([...existing.stack, ...job.stack])];
      existing.requirements = [...new Set([...existing.requirements, ...job.requirements])];
      if (!existing.description && job.description) existing.description = job.description;
      if (!existing.salary && job.salary) existing.salary = job.salary;
      bySourceId.set(identity, existing);
      if (canonical) byCanonicalUrl.set(canonical, existing);
      if (fingerprint) byFingerprint.set(fingerprint, existing);
    }
    return records;
  }

  async function fetchJson(url, sourceName) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`${sourceName} respondeu HTTP ${response.status}.`);
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new Error(`A consulta a ${sourceName} excedeu 20 segundos.`);
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function buildSearchQueries(query) {
    if (!query) return [""];
    const queryParts = query.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
    const role = normalize(queryParts[0] || "");
    const translation = JOB_SEARCH_ROLE_TRANSLATIONS.find(([sourceRole]) => normalize(sourceRole) === role)?.[1];
    const queries = [query];
    if (translation) queries.push([translation, ...queryParts.slice(1)].join(", "));
    return [...new Set(queries)];
  }

  async function queryHimalayas(queries, country) {
    const jobs = [];
    const totals = [];
    let partial = false;
    const level = {
      junior: "Junior",
      mid: "Mid",
      senior: "Senior"
    }[normalizeSeniority(data.resume.level)];
    for (const query of queries) {
      const params = new URLSearchParams({ page: "1" });
      if (country) params.set("country", country);
      if (query) params.set("q", query);
      if (level) params.set("seniority", level);
      const response = await fetchJson(`https://himalayas.app/jobs/api/search?${params}`, "Himalayas");
      if (!Array.isArray(response.jobs)) throw new Error("A resposta do Himalayas não contém a lista documentada de vagas.");
      const total = Number(response.totalCount) || response.jobs.length;
      totals.push(total);
      partial = partial || total > response.jobs.length;
      const normalizedJobs = response.jobs.map((job) => normalizeHimalayasJob(job, country)).filter(Boolean);
      if (response.jobs.length && !normalizedJobs.length) throw new Error("O Himalayas respondeu, mas nenhum resultado tinha os campos necessários para importação.");
      jobs.push(...normalizedJobs);
    }
    return { jobs, total: Math.max(...totals), totals, partial };
  }

  async function queryFourDayWeek(queries, country) {
    const jobs = [];
    const totals = [];
    let partial = false;
    const level = ["junior", "mid", "senior", "lead"].includes(normalizeSeniority(data.resume.level))
      ? normalizeSeniority(data.resume.level)
      : "";
    for (const query of queries) {
      const params = new URLSearchParams({ limit: "100", page: "1" });
      if (country) params.set("country", country);
      if (query) params.set("q", query);
      if (level) params.set("level", level);
      const response = await fetchJson(`https://4dayweek.io/api/v2/jobs?${params}`, "4dayweek.io");
      if (!Array.isArray(response.data)) throw new Error("A resposta do 4dayweek.io não contém a lista documentada de vagas.");
      totals.push(Number(response.total) || response.data.length);
      partial = partial || Boolean(response.has_more);
      const normalizedJobs = response.data.map((job) => normalizeFourDayWeekJob(job, country)).filter(Boolean);
      if (response.data.length && !normalizedJobs.length) throw new Error("O 4dayweek.io respondeu, mas nenhum resultado tinha os campos necessários para importação.");
      jobs.push(...normalizedJobs);
    }
    return { jobs, total: Math.max(...totals), totals, partial };
  }

  function readOpportunityCache() {
    try {
      const raw = sessionStorage.getItem(JOB_SEARCH_CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      if (!cache || typeof cache !== "object" || !Array.isArray(cache.sources)) throw new Error("Formato de cache de vagas inválido.");
      if (!Number.isFinite(cache.checkedAt) || Date.now() - cache.checkedAt > JOB_SEARCH_CACHE_TTL_MS) return null;
      return cache;
    } catch (error) {
      console.error("Não foi possível ler os resultados recentes da busca.", error);
      return null;
    }
  }

  function saveOpportunityCache(cache) {
    try {
      sessionStorage.setItem(JOB_SEARCH_CACHE_KEY, JSON.stringify(cache));
      return true;
    } catch (error) {
      console.error("Não foi possível manter os resultados recentes nesta aba.", error);
      return false;
    }
  }

  function formatCheckedAt(value) {
    return value ? new Date(value).toLocaleString("pt-BR") : "";
  }

  function renderSourceStatuses(sources) {
    const publishedStatus = publishedFeedMetadata
      ? {
        name: "Feed estático do GitHub Pages",
        status: publishedFeedMetadata.lastAttemptStatus === "error" ? "error" : isPublishedFeedStale() ? "stale" : "published",
        jobs: publishedFeedJobs.length,
        checkedAt: publishedFeedMetadata.updatedAt,
        lastAttemptAt: publishedFeedMetadata.lastAttemptAt,
        message: publishedFeedMetadata.lastAttemptMessage || ""
      }
      : publishedFeedError
        ? { name: "Feed estático do GitHub Pages", status: "error", jobs: 0, message: publishedFeedError }
        : null;
    const statusItems = [...sources, ...(publishedStatus ? [publishedStatus] : [])];
    jobSourceStatus.innerHTML = statusItems.map((source) => {
      const statusText = source.status === "success"
        ? `${source.jobs.length} vagas consultadas`
        : source.status === "partial"
          ? `${source.jobs.length} vagas exibidas; resultados totais por termo: ${(source.totals || [source.total]).join(", ")} (consulta limitada à primeira página de cada termo)`
          : source.status === "published"
            ? `${source.jobs} vagas carregadas do JSON; última coleta ${formatCheckedAt(source.checkedAt)}`
            : source.status === "stale"
              ? `Dados desatualizados; última coleta ${formatCheckedAt(source.checkedAt)}. ${source.jobs} vagas anteriores continuam disponíveis.`
          : source.status === "cached"
            ? `Falha na atualização (${source.message}); usando dados anteriores (${formatCheckedAt(source.successAt)})`
            : source.status === "empty"
              ? "Consulta concluída; nenhum resultado"
              : source.status === "error"
                  ? `${source.lastAttemptAt ? `Falha na última tentativa (${formatCheckedAt(source.lastAttemptAt)}): ` : ""}${source.message || "Não foi possível carregar ou atualizar o feed."}${source.jobs ? ` As ${source.jobs} vagas da última coleta foram preservadas.` : ""}`
                : source.message;
      const warningClass = ["error", "stale"].includes(source.status) ? " job-source-status-warning" : "";
      return `<p class="job-source-status-item${warningClass}"><strong>${escapeHtml(source.name)}:</strong> ${escapeHtml(statusText)}</p>`;
    }).join("");
  }

  function searchProfileText(resume) {
    return normalize([
      resume.name, resume.summary, resume.currentRole, resume.targetRole,
      resumeSkills(resume), formatResumeTools(resumeTools(resume)),
      formatExperiences(resume.experienceEntries || []) || resume.experience,
      resume.education, resume.courses, resume.certifications, resume.otherInfo
    ].filter(Boolean).join(" "));
  }

  function phraseInText(text, phrase) {
    const normalizedText = normalize(text);
    const normalizedPhrase = normalize(phrase);
    if (!normalizedText || !normalizedPhrase) return false;
    if (normalizedText.includes(normalizedPhrase)) return true;
    return normalizedPhrase.length <= 3 && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedPhrase)}(?=$|[^\\p{L}\\p{N}])`, "u").test(normalizedText);
  }

  function hasEquivalentEvidence(candidateEvidence, jobEvidence) {
    if (phraseInText(jobEvidence, candidateEvidence)) return true;
    const candidate = normalize(candidateEvidence);
    const job = normalize(jobEvidence);
    return JOB_TERM_EQUIVALENCES.some((group) => {
      const aliases = group.map(normalize);
      return aliases.some((alias) => phraseInText(candidate, alias)) && aliases.some((alias) => phraseInText(job, alias));
    });
  }

  function splitEvidenceTerms(value) {
    return [...new Set(String(value || "").split(/[\n,;•]+/).map((term) => term.trim()).filter((term) => term.length > 1))];
  }

  function getOpportunityFit(job) {
    const resume = data.resume;
    const profileText = searchProfileText(resume);
    const jobText = normalize([
      job.title, job.company, job.description, job.requirements.join(" "),
      job.skills.join(" "), job.tools.join(" "), job.stack.join(" "),
      job.categories.join(" "), job.location
    ].join(" "));
    const candidateSkills = [...new Set([
      ...splitEvidenceTerms(resumeSkills(resume)),
      ...resumeTools(resume).map((tool) => tool.name)
    ])];
    const sourceSkills = [...new Set([...job.requirements, ...job.skills, ...job.tools, ...job.stack])];
    const dimensions = [];
    const matchedSkills = [];
    const reviewSkills = [];

    if (candidateSkills.length && sourceSkills.length) {
      for (const skill of sourceSkills) {
        if (hasEquivalentEvidence(skill, profileText)) matchedSkills.push(skill);
        else reviewSkills.push(skill);
      }
      dimensions.push({
        label: `Competências e requisitos: ${matchedSkills.length}/${sourceSkills.length}`,
        weight: JOB_FIT_WEIGHTS.skills,
        score: matchedSkills.length / sourceSkills.length
      });
    } else if (candidateSkills.length && job.description) {
      for (const skill of candidateSkills) {
        if (hasEquivalentEvidence(skill, jobText)) matchedSkills.push(skill);
      }
      dimensions.push({
        label: `Competências encontradas no anúncio: ${matchedSkills.length}/${candidateSkills.length}`,
        weight: JOB_FIT_WEIGHTS.skills,
        score: matchedSkills.length / candidateSkills.length
      });
    }

    const experienceRoles = [
      resume.currentRole,
      ...(resume.experienceEntries || []).map((entry) => entry.role),
      ...splitEvidenceTerms(resume.experience)
    ].filter(Boolean);
    const uniqueExperienceRoles = [...new Set(experienceRoles)];
    if (uniqueExperienceRoles.length && jobText) {
      const relevantRoles = uniqueExperienceRoles.filter((role) => hasEquivalentEvidence(role, jobText));
      dimensions.push({
        label: `Experiência profissional relacionada: ${relevantRoles.length}/${uniqueExperienceRoles.length}`,
        weight: JOB_FIT_WEIGHTS.experience,
        score: relevantRoles.length / uniqueExperienceRoles.length
      });
    }

    const candidateRoles = [resume.targetRole, resume.currentRole].filter(Boolean);
    const roleScores = [];
    if (candidateRoles.length && job.title) {
      roleScores.push(candidateRoles.some((role) => hasEquivalentEvidence(role, job.title)) ? 1 : 0);
    }
    if (resume.level && job.level) {
      const ranks = ["estagio", "junior", "mid", "senior", "lead"];
      const candidateRank = ranks.indexOf(normalizeSeniority(resume.level));
      const requestedRank = ranks.indexOf(job.level);
      if (candidateRank >= 0 && requestedRank >= 0) {
        roleScores.push(candidateRank >= requestedRank ? 1 : candidateRank === requestedRank - 1 ? 0.5 : 0);
      }
    }
    if (roleScores.length) {
      dimensions.push({
        label: `Cargo e senioridade: ${Math.round(roleScores.reduce((sum, score) => sum + score, 0) / roleScores.length * 100)}%`,
        weight: JOB_FIT_WEIGHTS.role,
        score: roleScores.reduce((sum, score) => sum + score, 0) / roleScores.length
      });
    }

    const locationEvidence = resume.location && job.location;
    const modalityPreference = document.querySelector("#job-modality-preference").value;
    const locationScores = [];
    if (locationEvidence) {
      const candidateLocationParts = resume.location.split(/[,\n]+/).map((part) => normalize(part.trim())).filter((part) => part.length >= 3);
      const locationMatches = candidateLocationParts.some((part) => job.locationTerms.some((location) =>
        normalize(location).includes(part) || part.includes(normalize(location))));
      if (job.arrangement === "remote" && (!job.locationTerms.length || locationMatches)) locationScores.push(1);
      else if (job.locationTerms.length && candidateLocationParts.length) locationScores.push(locationMatches ? 1 : 0);
    }
    if (modalityPreference && job.arrangement) locationScores.push(modalityPreference === job.arrangement ? 1 : 0);
    if (locationScores.length) {
      dimensions.push({
        label: `Localização e modalidade: ${Math.round(locationScores.reduce((sum, score) => sum + score, 0) / locationScores.length * 100)}%`,
        weight: JOB_FIT_WEIGHTS.location,
        score: locationScores.reduce((sum, score) => sum + score, 0) / locationScores.length
      });
    }

    const educationEvidence = [resume.education, resume.courses, resume.certifications].filter(Boolean).join(" ");
    const jobEducationEvidence = job.educationRequirements.join(" ");
    if (educationEvidence && jobEducationEvidence) {
      const matchedEducation = hasEquivalentEvidence(educationEvidence, jobEducationEvidence);
      dimensions.push({
        label: `Formação relacionada ao requisito identificado: ${matchedEducation ? "evidência encontrada" : "sem evidência"}`,
        weight: JOB_FIT_WEIGHTS.education,
        score: matchedEducation ? 1 : 0
      });
    }

    const availableWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    const calculatedScore = availableWeight
      ? Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / availableWeight * 100)
      : null;
    const unverifiedMandatory = job.mandatoryRequirements.filter((requirement) =>
      !hasEquivalentEvidence(requirement, profileText));
    const score = calculatedScore !== null && unverifiedMandatory.length
      ? Math.min(calculatedScore, 49)
      : calculatedScore;
    return {
      score,
      calculatedScore,
      dimensions,
      matchedSkills,
      reviewSkills,
      unverifiedMandatory,
      profileHasData: Boolean(profileText)
    };
  }

  function validateJobPageUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return { error: "Informe um endereço completo e válido, começando com http:// ou https://." };
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return { error: "Use um endereço HTTP ou HTTPS público, sem usuário ou senha no link." };
    }
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || (!host.includes(".") && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))) {
      return { error: "Endereços locais ou de rede privada não podem ser consultados." };
    }
    if (host.includes(":")) return { error: "Endereços IPv6 diretos não são aceitos. Use o domínio público do anúncio." };
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
      const octets = host.split(".").map(Number);
      const [first, second] = octets;
      const privateAddress = octets.some((part) => part > 255)
        || first === 0 || first === 10 || first === 127 || first >= 224
        || (first === 100 && second >= 64 && second <= 127)
        || (first === 169 && second === 254)
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168)
        || (first === 198 && (second === 18 || second === 19));
      if (privateAddress) return { error: "Endereços locais ou de rede privada não podem ser consultados." };
    }
    url.hash = "";
    return { url: url.href };
  }

  function jobAnalysisList(value) {
    const values = Array.isArray(value) ? value : [value];
    return [...new Set(values.flatMap((item) => {
      const text = typeof item === "string"
        ? item
        : item && typeof item === "object"
          ? textValue(item.name || item.value || item.description || item.credentialCategory)
          : "";
      return text.split(/[\n,;•]+/).map((entry) => entry.trim()).filter(Boolean);
    }))];
  }

  function plainJobDescription(value) {
    if (typeof value !== "string") return "";
    return new DOMParser().parseFromString(value, "text/html").body.textContent.replace(/\s+/g, " ").trim();
  }

  function postingObjects(value) {
    if (Array.isArray(value)) return value.flatMap(postingObjects);
    if (!value || typeof value !== "object") return [];
    const graph = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(postingObjects) : [];
    const type = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    return [...(type.some((item) => item === "JobPosting" || String(item || "").endsWith("/JobPosting")) ? [value] : []), ...graph];
  }

  function publicMetadata(documentNode, baseUrl) {
    const metadata = (name) => documentNode.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content?.trim() || "";
    const structured = [];
    for (const script of documentNode.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        structured.push(...postingObjects(JSON.parse(script.textContent || "")));
      } catch (error) {
        console.warn("Um bloco de metadados estruturados da página não pôde ser lido.", error);
      }
    }
    const posting = structured[0] || {};
    const organization = posting.hiringOrganization;
    const address = Array.isArray(posting.jobLocation) ? posting.jobLocation[0]?.address : posting.jobLocation?.address;
    const location = address && typeof address === "object"
      ? [address.addressLocality, address.addressRegion, address.addressCountry?.name || address.addressCountry].filter(Boolean).join(", ")
      : "";
    const title = textValue(posting.title) || metadata("og:title") || documentNode.title || "";
    const company = textValue(typeof organization === "string" ? organization : organization?.name);
    const description = plainJobDescription(textValue(posting.description) || metadata("description") || metadata("og:description"));
    const employment = Array.isArray(posting.employmentType) ? posting.employmentType.join(", ") : textValue(posting.employmentType);
    const salaryValue = posting.baseSalary?.value;
    const salaryAmount = typeof salaryValue === "number"
      ? String(salaryValue)
      : textValue(typeof salaryValue === "object" ? salaryValue?.value : salaryValue);
    const salary = [textValue(posting.baseSalary?.currency), salaryAmount, textValue(posting.baseSalary?.value?.unitText)]
      .filter(Boolean).join(" ");
    const remote = posting.jobLocationType === "TELECOMMUTE";
    let canonicalUrl = "";
    const canonicalHref = documentNode.querySelector('link[rel~="canonical"]')?.getAttribute("href") || textValue(posting.url);
    if (canonicalHref) {
      try {
        const candidateUrl = new URL(canonicalHref, baseUrl);
        if (candidateUrl.origin === new URL(baseUrl).origin && ["http:", "https:"].includes(candidateUrl.protocol)) {
          canonicalUrl = candidateUrl.href;
        }
      } catch (error) {
        console.warn("O endereço canônico informado pela página foi ignorado por ser inválido.", error);
      }
    }
    return {
      canonicalUrl,
      title: plainJobDescription(title),
      company: plainJobDescription(company),
      location,
      modality: remote ? "remote" : normalizeArrangement(employment),
      seniority: textValue(posting.seniority || posting.level || posting.jobLevel),
      salary,
      description,
      skills: jobAnalysisList(posting.skills),
      tools: [],
      educationRequirements: jobAnalysisList(posting.educationRequirements),
      experienceRequirements: jobAnalysisList(posting.experienceRequirements),
      requiredRequirements: jobAnalysisList(posting.qualifications),
      preferredRequirements: [],
      responsibilities: jobAnalysisList(plainJobDescription(textValue(posting.responsibilities)))
    };
  }

  async function readLimitedResponse(response, limit = 2 * 1024 * 1024) {
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > limit) throw new Error("A página excede o limite de leitura de 2 MB.");
    if (!response.body?.getReader) {
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > limit) throw new Error("A página excede o limite de leitura de 2 MB.");
      return text;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("A página excede o limite de leitura de 2 MB.");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  }

  async function fetchJobPosting(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        headers: { Accept: "text/html, text/plain;q=0.9" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`O site respondeu com HTTP ${response.status}.`);
      const contentType = response.headers.get("content-type") || "";
      if (!/^(text\/html|text\/plain)(?:\s*;|$)/i.test(contentType)) {
        throw new Error("A resposta não é uma página HTML ou texto legível.");
      }
      const content = await readLimitedResponse(response);
      const parsed = new DOMParser().parseFromString(content, contentType.includes("text/plain") ? "text/html" : "text/html");
      const metadata = publicMetadata(parsed, url);
      if (!metadata.description) {
        const visibleText = parsed.body?.innerText || parsed.body?.textContent || "";
        metadata.description = visibleText.replace(/\s+/g, " ").trim().slice(0, 30000);
      }
      return metadata;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("A página demorou mais de 12 segundos para responder.");
      if (error instanceof TypeError) throw new Error("O navegador ou o site não permitiu o acesso (CORS, autenticação ou bloqueio).");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function analysisCandidateText(resume) {
    return [
      resume.summary, resume.currentRole, resume.targetRole, resumeSkills(resume),
      (resume.experienceEntries || []).map((entry) => [entry.role, entry.company, entry.description].filter(Boolean).join(" ")).join(" "),
      resume.experience, resume.education, resume.courses, resume.certifications
    ].filter(Boolean).join(" ");
  }

  function analyzeJobAgainstResume(analysis) {
    const resume = data.resume;
    const candidateText = analysisCandidateText(resume);
    const profileSkills = resumeSkills(resume);
    const experienceEntries = resume.experienceEntries || [];
    const profileExperienceText = experienceEntries.map((entry) => [entry.role, entry.description].filter(Boolean).join(" ")).join(" ") || resume.experience;
    const candidateCompetenceText = [profileSkills, resume.summary, profileExperienceText].filter(Boolean).join(" ");
    const profileTools = resumeTools(resume);
    const submittedRequirements = [...new Set([
      ...analysis.requiredRequirements,
      ...jobAnalysisList(analysis.skills),
      ...analysis.preferredRequirements
    ])];
    const isKnownTool = (item) => TOOL_CATALOG.some((tool) => toolAliases(tool).some((alias) => phraseInText(item, alias)))
      || profileTools.some((tool) => phraseInText(item, normalize(tool.name)));
    const inferredToolRequirements = submittedRequirements.filter(isKnownTool);
    const required = submittedRequirements.filter((item) => !isKnownTool(item));
    const matchedSkills = required.filter((item) => hasEquivalentEvidence(candidateCompetenceText, item));
    const unverifiedRequired = analysis.requiredRequirements.filter((item) => !isKnownTool(item) && !hasEquivalentEvidence(candidateCompetenceText, item));
    const dimensions = [];
    const evidenceCriteria = [];
    if (required.length && candidateCompetenceText) {
      dimensions.push({ label: `Competências e requisitos (${matchedSkills.length}/${required.length})`, weight: JOB_FIT_WEIGHTS.skills, score: matchedSkills.length / required.length });
      evidenceCriteria.push(...required.map((item) => ({
        label: item,
        kind: analysis.preferredRequirements.includes(item) ? "Requisito desejável" : "Competência/requisito",
        status: hasEquivalentEvidence(candidateCompetenceText, item) ? "Evidência encontrada" : "Sem evidência suficiente"
      })));
    }

    const requiredTools = [...new Set([...jobAnalysisList(analysis.tools), ...inferredToolRequirements])];
    const toolChecks = requiredTools.map((requirement) => {
      const normalizedRequirement = normalize(requirement);
      const requestedLevel = PROFICIENCY_LEVELS.find((level) => new RegExp(`\\b(?:${level.pattern})\\b`, "i").test(normalizedRequirement));
      const name = requestedLevel
        ? normalizedRequirement.replace(new RegExp(`\\b(?:${requestedLevel.pattern})\\b`, "i"), "").replace(/\b(nivel|dominio|conhecimento|em|de)\b/gi, "").replace(/[—–-]+$/g, "").trim()
        : requirement;
      const found = profileTools.find((tool) => toolIdentity(tool.name) === toolIdentity(name) || hasEquivalentEvidence(tool.name, name));
      let status = found ? "Ferramenta identificada; conferir nível" : "Sem evidência suficiente";
      let score = found ? 1 : 0;
      if (found && requestedLevel) {
        const candidateRank = PROFICIENCY_LEVELS.findIndex((level) => level.value === found.level);
        const requiredRank = PROFICIENCY_LEVELS.indexOf(requestedLevel);
        status = candidateRank < 0
          ? "Nível não informado no perfil"
          : candidateRank >= requiredRank
            ? "Ferramenta e nível compatíveis"
            : "Nível informado abaixo do solicitado";
        score = candidateRank >= requiredRank ? 1 : 0;
      }
      evidenceCriteria.push({ label: requirement, kind: "Ferramenta/software", status });
      return score;
    });
    const knownProfileTools = profileTools.length > 0;
    const competencyCount = required.length + (knownProfileTools ? requiredTools.length : 0);
    const competencyScore = competencyCount
      ? (matchedSkills.length + (knownProfileTools ? toolChecks.reduce((sum, value) => sum + value, 0) : 0)) / competencyCount
      : null;
    if (competencyScore !== null && (profileSkills || knownProfileTools)) {
      const prior = dimensions.find((dimension) => dimension.weight === JOB_FIT_WEIGHTS.skills);
      if (prior) prior.score = competencyScore;
      else dimensions.push({ label: `Competências e ferramentas avaliadas (${competencyCount} itens)`, weight: JOB_FIT_WEIGHTS.skills, score: competencyScore });
    }

    const experienceTerms = analysis.experienceRequirements;
    if (experienceEntries.length && (experienceTerms.length || analysis.title || analysis.description)) {
      const experienceText = profileExperienceText;
      const terms = experienceTerms.length ? experienceTerms : analysis.responsibilities.length ? analysis.responsibilities : [analysis.title].filter(Boolean);
      const hits = terms.filter((term) => hasEquivalentEvidence(experienceText, term)).length;
      dimensions.push({ label: `Experiência profissional relacionada (${hits}/${terms.length})`, weight: JOB_FIT_WEIGHTS.experience, score: terms.length ? hits / terms.length : 0 });
      for (const term of terms) evidenceCriteria.push({
        label: term,
        kind: "Experiência",
        status: hasEquivalentEvidence(experienceText, term) ? "Evidência encontrada" : "Sem evidência suficiente"
      });
    }

    const roleEvidence = [resume.targetRole, resume.currentRole].filter(Boolean);
    const roleParts = [];
    if (analysis.title && roleEvidence.length) {
      roleParts.push(roleEvidence.some((role) => hasEquivalentEvidence(role, analysis.title)) ? 1 : 0);
    }
    const candidateLevel = normalizeSeniority(resume.level);
    const requestedLevel = normalizeSeniority(analysis.seniority);
    if (candidateLevel && requestedLevel) {
      const ranks = ["estagio", "junior", "mid", "senior", "lead"];
      const candidateRank = ranks.indexOf(candidateLevel);
      const requestedRank = ranks.indexOf(requestedLevel);
      if (candidateRank >= 0 && requestedRank >= 0) roleParts.push(candidateRank >= requestedRank ? 1 : candidateRank === requestedRank - 1 ? 0.5 : 0);
    }
    if (roleParts.length) dimensions.push({
      label: `Cargo e senioridade comparados (${Math.round(roleParts.reduce((sum, part) => sum + part, 0) / roleParts.length * 100)}%)`,
      weight: JOB_FIT_WEIGHTS.role,
      score: roleParts.reduce((sum, part) => sum + part, 0) / roleParts.length
    });

    if (resume.location && analysis.location) {
      const locationMatches = hasEquivalentEvidence(resume.location, analysis.location) || hasEquivalentEvidence(analysis.location, resume.location);
      dimensions.push({ label: `Localização informada (${locationMatches ? "compatível por texto" : "diferença a conferir"})`, weight: JOB_FIT_WEIGHTS.location, score: locationMatches ? 1 : 0 });
    }
    const educationRequirements = analysis.educationRequirements;
    const profileEducation = [resume.education, resume.courses, resume.certifications].filter(Boolean).join(" ");
    if (educationRequirements.length && profileEducation) {
      const hits = educationRequirements.filter((term) => hasEquivalentEvidence(profileEducation, term)).length;
      dimensions.push({ label: `Formação e requisitos acadêmicos (${hits}/${educationRequirements.length})`, weight: JOB_FIT_WEIGHTS.education, score: hits / educationRequirements.length });
      evidenceCriteria.push(...educationRequirements.map((term) => ({
        label: term,
        kind: "Formação",
        status: hasEquivalentEvidence(profileEducation, term) ? "Evidência encontrada" : "Sem evidência suficiente"
      })));
    }

    const availableWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
    const hasExplicitJobCriteria = required.length > 0
      || requiredTools.length > 0
      || analysis.educationRequirements.length > 0
      || analysis.experienceRequirements.length > 0;
    const missingCoreEvidence = (required.length > 0 && !candidateCompetenceText)
      || (requiredTools.length > 0 && !profileTools.length);
    const score = availableWeight && dimensions.length >= 2 && hasExplicitJobCriteria && !missingCoreEvidence
      ? Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / availableWeight * 100)
      : null;
    const missing = [];
    if (!analysis.title) missing.push("título da vaga");
    if (!analysis.company) missing.push("empresa");
    if (analysis.description.length < 100) missing.push("descrição detalhada");
    if (!hasExplicitJobCriteria) missing.push("requisitos, competências, ferramentas, formação ou experiência explicitamente informados");
    if (required.length && !candidateCompetenceText) missing.push("evidências de competências no perfil salvo");
    if (requiredTools.length && !profileTools.length) missing.push("ferramentas cadastradas no perfil para comparar os requisitos");
    if (analysis.educationRequirements.length && !profileEducation) missing.push("formação cadastrada no perfil");
    if (analysis.experienceRequirements.length && !experienceEntries.length) missing.push("experiências profissionais no perfil");
    if (analysis.title && !resume.targetRole && !resume.currentRole) missing.push("cargo atual ou desejado no perfil");
    if (analysis.location && !resume.location) missing.push("localização cadastrada no perfil");
    if (analysis.modality) missing.push("preferência de modalidade não cadastrada no perfil");
    if (!candidateText && !profileTools.length && !resume.education) missing.push("dados suficientes no perfil profissional salvo");
    const reviewTools = evidenceCriteria.filter((item) =>
      item.kind === "Ferramenta/software" && item.status !== "Ferramenta e nível compatíveis");
    return {
      score,
      level: score === null ? "Fit inconclusivo" : score >= 75 ? "Compatibilidade alta" : score >= 50 ? "Compatibilidade moderada" : "Compatibilidade baixa",
      dimensions,
      evidenceCriteria,
      matchedSkills,
      unverified: unverifiedRequired,
      reviewTools,
      missing: [...new Set(missing)],
      relevantExperiences: experienceEntries.filter((entry) => [entry.role, entry.description].some((text) => analysis.title && hasEquivalentEvidence(text, analysis.title)))
    };
  }

  function getAnalysisFormData() {
    const form = new FormData(jobAnalysisForm);
    return {
      id: activeJobAnalysisId || createId(),
      url: safeUrl(String(form.get("url") || "").trim()),
      canonicalUrl: jobAnalysisForm.dataset.canonicalUrl || "",
      title: String(form.get("title") || "").trim(),
      company: String(form.get("company") || "").trim(),
      location: String(form.get("location") || "").trim(),
      modality: String(form.get("modality") || ""),
      seniority: String(form.get("seniority") || "").trim(),
      salary: String(form.get("salary") || "").trim(),
      responsibilities: jobAnalysisList(form.get("responsibilities")),
      description: String(form.get("description") || "").trim(),
      requiredRequirements: jobAnalysisList(form.get("requiredRequirements")),
      preferredRequirements: jobAnalysisList(form.get("preferredRequirements")),
      skills: jobAnalysisList(form.get("skills")),
      tools: jobAnalysisList(form.get("tools")),
      educationRequirements: jobAnalysisList(form.get("educationRequirements")),
      experienceRequirements: jobAnalysisList(form.get("experienceRequirements")),
      personalNotes: String(form.get("personalNotes") || "").trim(),
      method: jobAnalysisForm.dataset.method === "automatic" ? "automatic" : "manual",
      completeness: "partial",
      status: data.jobAnalyses.find((analysis) => analysis.id === activeJobAnalysisId)?.status || "analyzed",
      trackedJobId: data.jobAnalyses.find((analysis) => analysis.id === activeJobAnalysisId)?.trackedJobId || "",
      createdAt: data.jobAnalyses.find((analysis) => analysis.id === activeJobAnalysisId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function renderJobAnalysis(analysis) {
    const result = analyzeJobAgainstResume(analysis);
    const sourceLabel = analysis.method === "automatic" ? "Metadados públicos lidos diretamente no navegador" : "Descrição informada manualmente";
    const completenessLabel = analysis.completeness === "complete" ? "Análise com dados suficientes" : "Análise parcial — confira os dados ausentes";
    const scoreText = result.score === null ? "Fit inconclusivo" : `Fit estimado: ${result.score}% — ${result.level.toLowerCase()}`;
    const dimensionList = result.dimensions.map((dimension) =>
      `<li>${escapeHtml(dimension.label)} <span>(peso ${dimension.weight}%)</span></li>`).join("");
    const evidenceList = result.evidenceCriteria.map((item) =>
      `<li><strong>${escapeHtml(item.kind)}:</strong> ${escapeHtml(item.label)} — ${escapeHtml(item.status)}</li>`).join("");
    const missing = result.missing.length
      ? `<section><h5>Limitações e informações ausentes</h5><p>${escapeHtml(result.missing.join("; "))}. A ausência de evidência não comprova que você não atenda ao requisito.</p></section>`
      : "";
    const unverified = result.unverified.length
      ? `<section><h5>Requisitos obrigatórios sem evidência no perfil</h5><ul>${result.unverified.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p>Confira esses pontos manualmente; a ausência no currículo não significa que o requisito não seja atendido.</p></section>`
      : "";
    const reviewTools = result.reviewTools.length
      ? `<section><h5>Ferramentas e níveis para conferir</h5><ul>${result.reviewTools.map((item) => `<li>${escapeHtml(item.label)} — ${escapeHtml(item.status)}</li>`).join("")}</ul></section>`
      : "";
    const recommendations = [
      result.matchedSkills.length ? `Destaque, se forem relevantes para a vaga: ${result.matchedSkills.join(", ")}.` : "",
      result.relevantExperiences.length ? `Revise experiências relacionadas ao cargo: ${result.relevantExperiences.map((entry) => entry.role || entry.company).filter(Boolean).join(", ")}.` : "",
      "Use somente experiências, competências e níveis que estejam realmente confirmados no seu perfil."
    ].filter(Boolean);
    const encodedId = escapeHtml(analysis.id);
    jobAnalysisResult.innerHTML = `<article class="job-analysis-report">
      <div class="job-analysis-report-heading"><div><p class="eyebrow">ANÁLISE LOCAL</p><h4>${escapeHtml(analysis.title || "Cargo não informado")}</h4><p>${escapeHtml(analysis.company || "Empresa não informada")}${analysis.location ? ` · ${escapeHtml(analysis.location)}` : ""}</p></div><strong class="analysis-fit">${escapeHtml(scoreText)}</strong></div>
      <dl class="analysis-summary">
        <div><dt>Modalidade</dt><dd>${escapeHtml({ remote: "Remota", hybrid: "Híbrida", onsite: "Presencial" }[analysis.modality] || "Não informada")}</dd></div>
        <div><dt>Senioridade</dt><dd>${escapeHtml(analysis.seniority || "Não informada")}</dd></div>
        <div><dt>Faixa salarial</dt><dd>${escapeHtml(analysis.salary || "Não informada")}</dd></div>
        <div><dt>Fonte / método</dt><dd>${escapeHtml(sourceLabel)}</dd></div>
        <div><dt>Analisada em</dt><dd>${escapeHtml(new Date(analysis.updatedAt).toLocaleString("pt-BR"))}</dd></div>
      </dl>
      ${analysis.url ? `<p class="analysis-original-link">Link original: <a href="${escapeHtml(analysis.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(analysis.url)}</a></p>` : ""}
      ${analysis.canonicalUrl && analysis.canonicalUrl !== analysis.url ? `<p class="analysis-original-link">URL canônica informada pelo anúncio: ${escapeHtml(analysis.canonicalUrl)}</p>` : ""}
      <p class="analysis-completeness">${escapeHtml(completenessLabel)}</p>
      <p class="analysis-score-caveat">Estimativa determinística com dados disponíveis; não representa chance de contratação nem decisão sobre sua candidatura.</p>
      <section><h5>Critérios considerados</h5>${dimensionList ? `<ul>${dimensionList}</ul>` : "<p>Não há evidências suficientes para comparar dimensões e calcular um percentual confiável.</p>"}</section>
      ${evidenceList ? `<section><h5>Evidências comparadas</h5><ul>${evidenceList}</ul></section>` : ""}
      ${unverified}${reviewTools}${missing}
      <section><h5>Recomendações práticas</h5><ul>${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      ${analysis.preferredRequirements.length ? `<section><h5>Requisitos desejáveis informados</h5><ul>${analysis.preferredRequirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
      ${analysis.responsibilities.length ? `<section><h5>Responsabilidades informadas</h5><ul>${analysis.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
      ${analysis.personalNotes ? `<section><h5>Suas anotações</h5><p>${escapeHtml(analysis.personalNotes)}</p></section>` : ""}
      <details class="analysis-description"><summary>Conferir descrição original</summary><pre>${escapeHtml(analysis.description)}</pre></details>
      <div class="job-analysis-actions">
        <button class="button button-outline" type="button" data-analysis-action="edit" data-id="${encodedId}">Editar descrição</button>
        <button class="button button-outline" type="button" data-analysis-action="interesting" data-id="${encodedId}">Marcar interessante / salvar</button>
        <button class="button button-outline" type="button" data-analysis-action="planned" data-id="${encodedId}">Planejar candidatura</button>
        <button class="button button-primary" type="button" data-analysis-action="applied" data-id="${encodedId}">Registrar candidatura realizada</button>
        <button class="button button-quiet" type="button" data-analysis-action="delete" data-id="${encodedId}">Excluir análise</button>
      </div>
      ${analysis.trackedJobId ? `<p class="analysis-tracked-note">Vaga vinculada ao acompanhamento. A análise continua salva separadamente.</p>` : ""}
    </article>`;
    jobAnalysisResult.hidden = false;
    renderSavedJobAnalyses();
  }

  function renderSavedJobAnalyses() {
    const section = document.querySelector("#saved-job-analyses-section");
    const list = document.querySelector("#saved-job-analyses-list");
    const analyses = [...data.jobAnalyses].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    section.hidden = analyses.length === 0;
    list.innerHTML = analyses.map((analysis) => `<article class="saved-analysis-row">
      <div><strong>${escapeHtml(analysis.title || "Cargo não informado")}</strong><span>${escapeHtml(analysis.company || "Empresa não informada")} · ${escapeHtml(new Date(analysis.updatedAt).toLocaleDateString("pt-BR"))}</span></div>
      <div><span class="analysis-status">${escapeHtml(`${analysis.completeness === "complete" ? "Completa" : "Parcial"} · ${{ analyzed: "Analisada", interesting: "Interessante / salva", planned: "Planejada", applied: "Candidatura registrada" }[analysis.status] || "Analisada"}`)}</span>
        <button class="button button-quiet" type="button" data-analysis-action="open" data-id="${escapeHtml(analysis.id)}">Reabrir</button></div>
    </article>`).join("");
  }

  function persistJobAnalysis(analysis) {
    const previous = [...data.jobAnalyses];
    const existingIndex = data.jobAnalyses.findIndex((item) => item.id === analysis.id);
    if (existingIndex >= 0) data.jobAnalyses[existingIndex] = analysis;
    else data.jobAnalyses.unshift(analysis);
    if (!saveData()) {
      data.jobAnalyses = previous;
      return false;
    }
    activeJobAnalysisId = analysis.id;
    renderJobAnalysis(analysis);
    return true;
  }

  function setAnalysisFormValues(analysis) {
    for (const [name, value] of Object.entries(analysis)) {
      const field = jobAnalysisForm.elements.namedItem(name);
      if (!field) continue;
      field.value = Array.isArray(value) ? value.join("\n") : value;
    }
    jobAnalysisForm.dataset.method = analysis.method || "manual";
    jobAnalysisForm.dataset.canonicalUrl = analysis.canonicalUrl || "";
    document.querySelector("#job-analysis-manual").open = true;
  }

  async function submitJobAnalysis(event) {
    event.preventDefault();
    if (jobAnalysisBusy) return;
    jobAnalysisBusy = true;
    const button = document.querySelector("#analyze-job-link-button");
    button.disabled = true;
    let method = "manual";
    const rawUrl = document.querySelector("#job-analysis-url").value.trim();
    try {
      if (rawUrl) {
        jobAnalysisStatus.textContent = "Validando o endereço…";
        const checked = validateJobPageUrl(rawUrl);
        if (checked.error) {
          jobAnalysisStatus.textContent = checked.error;
          document.querySelector("#job-analysis-manual").open = true;
          return;
        }
        jobAnalysisStatus.textContent = "Tentando acessar a página diretamente, sem credenciais ou redirecionamentos…";
        try {
          const descriptionWasAlreadyProvided = Boolean(document.querySelector("#job-analysis-description").value.trim());
          const metadata = await fetchJobPosting(checked.url);
          jobAnalysisForm.dataset.canonicalUrl = metadata.canonicalUrl || "";
          jobAnalysisStatus.textContent = "Extraindo metadados públicos e texto disponível…";
          const fields = {
            title: metadata.title,
            company: metadata.company,
            location: metadata.location,
            modality: metadata.modality,
            seniority: metadata.seniority,
            salary: metadata.salary,
            description: metadata.description,
            responsibilities: metadata.responsibilities.join("\n"),
            skills: metadata.skills.join("\n"),
            educationRequirements: metadata.educationRequirements.join("\n"),
            experienceRequirements: metadata.experienceRequirements.join("\n"),
            requiredRequirements: metadata.requiredRequirements.join("\n")
          };
          for (const [name, value] of Object.entries(fields)) {
            const field = jobAnalysisForm.elements.namedItem(name);
            if (field && !field.value.trim() && value) field.value = value;
          }
          if (!document.querySelector("#job-analysis-description").value.trim()) {
            throw new Error("A página foi acessada, mas não disponibilizou uma descrição de vaga utilizável.");
          }
          method = descriptionWasAlreadyProvided ? "manual" : "automatic";
          jobAnalysisStatus.textContent = "Texto obtido. Revise os campos identificados antes de confirmar a análise.";
        } catch (error) {
          console.warn("A página não forneceu conteúdo de vaga legível para análise automática.", error);
          jobAnalysisStatus.textContent = `Não foi possível obter uma descrição suficiente automaticamente (${error.message}). Alguns sites bloqueiam esse tipo de acesso. O link foi preservado; cole a descrição da vaga abaixo para continuar.`;
          document.querySelector("#job-analysis-manual").open = true;
          if (!document.querySelector("#job-analysis-description").value.trim()) return;
        }
      }
      const analysis = getAnalysisFormData();
      if (!analysis.description) {
        document.querySelector("#job-analysis-manual").open = true;
        jobAnalysisStatus.textContent = "Cole a descrição da oportunidade para continuar. O link informado foi preservado.";
        document.querySelector("#job-analysis-description").focus();
        return;
      }
      analysis.method = method;
      const fitResult = analyzeJobAgainstResume(analysis);
      analysis.completeness = fitResult.score === null || fitResult.missing.length ? "partial" : "complete";
      jobAnalysisForm.dataset.method = method;
      jobAnalysisStatus.textContent = "Analisando a compatibilidade com o perfil salvo neste navegador…";
      if (persistJobAnalysis(analysis)) {
        jobAnalysisStatus.textContent = analysis.completeness === "partial"
          ? "Análise parcial salva neste navegador. Confira as informações insuficientes indicadas no resultado."
          : "Análise concluída e salva neste navegador. Nenhuma candidatura foi enviada.";
      } else {
        jobAnalysisStatus.textContent = "A análise foi calculada, mas não pôde ser salva. Verifique o espaço disponível no navegador e tente novamente.";
      }
    } catch (error) {
      console.error("Não foi possível concluir a análise da vaga.", error);
      jobAnalysisStatus.textContent = `A análise não foi concluída: ${error.message || "erro inesperado."}`;
    } finally {
      jobAnalysisBusy = false;
      button.disabled = false;
    }
  }

  function canonicalJobUrl(value) {
    const normalized = safeUrl(value);
    if (!normalized) return "";
    const url = new URL(normalized);
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    for (const parameter of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(parameter) || ["ref", "source", "trk", "trackingid"].includes(parameter.toLowerCase())) {
        url.searchParams.delete(parameter);
      }
    }
    return url.href;
  }

  function trackJobAnalysis(analysis, status) {
    const previousJobs = data.jobs.map((job) => ({ ...job, history: [...(job.history || [])] }));
    const previousAnalyses = [...data.jobAnalyses];
    const analysisUrl = canonicalJobUrl(analysis.canonicalUrl || analysis.url);
    const duplicate = data.jobs.find((job) =>
      (analysisUrl && [job.url, analysis.canonicalUrl].some((url) => canonicalJobUrl(url) === analysisUrl))
      || (analysis.title && analysis.company
        && normalize(job.title) === normalize(analysis.title)
        && normalize(job.company) === normalize(analysis.company)));
    if (duplicate && !window.confirm(`A oportunidade "${duplicate.title}" já está no acompanhamento. Atualizar apenas os campos vazios e anexar esta análise, preservando status e histórico?`)) return;
    const event = { at: new Date().toISOString(), event: "Análise de vaga vinculada", status };
    const required = [...new Set([
      ...analysis.requiredRequirements,
      ...analysis.skills,
      ...analysis.tools,
      ...analysis.educationRequirements,
      ...analysis.experienceRequirements
    ])];
    let trackedJob;
    if (duplicate) {
      trackedJob = {
        ...duplicate,
        title: duplicate.title || analysis.title,
        company: duplicate.company || analysis.company,
        location: duplicate.location || analysis.location,
        level: duplicate.level || analysis.seniority,
        url: duplicate.url || analysis.url,
        requirements: [...new Set([...jobAnalysisList(duplicate.requirements), ...required])].join("\n"),
        notes: [duplicate.notes, `Análise vinculada (${new Date().toLocaleDateString("pt-BR")}): ${analysis.title || "vaga"}${analysis.url ? ` — ${analysis.url}` : ""}${analysis.personalNotes ? `\nAnotações: ${analysis.personalNotes}` : ""}`].filter(Boolean).join("\n\n"),
        history: [...(duplicate.history || []), event]
      };
      const shouldAdvanceStatus = status === "applied"
        ? ["saved", "planned"].includes(duplicate.status)
        : status === "planned" && duplicate.status === "saved";
      if (shouldAdvanceStatus) {
        if (trackedJob.status !== status) trackedJob.history.push({ at: event.at, event: `Status atualizado: ${STATUSES[status]}`, status });
        trackedJob.status = status;
      }
      data.jobs = data.jobs.map((job) => job.id === duplicate.id ? trackedJob : job);
    } else {
      trackedJob = {
        id: createId(),
        title: analysis.title || "Cargo não informado",
        company: analysis.company,
        location: analysis.location,
        level: analysis.seniority,
        url: analysis.url,
        status: status === "applied" || status === "planned" ? status : "saved",
        requirements: required.join("\n"),
        notes: [
          `Adicionada a partir da análise de vaga (${new Date().toLocaleDateString("pt-BR")}).`,
          analysis.url ? `Link original: ${analysis.url}` : "",
          analysis.salary ? `Faixa salarial informada: ${analysis.salary}` : "",
          analysis.personalNotes ? `Anotações: ${analysis.personalNotes}` : "",
          analysis.description
        ].filter(Boolean).join("\n\n"),
        createdAt: new Date().toISOString(),
        history: [event]
      };
      data.jobs.unshift(trackedJob);
    }
    const updatedAnalysis = { ...analysis, status, trackedJobId: trackedJob.id, updatedAt: new Date().toISOString() };
    data.jobAnalyses = data.jobAnalyses.map((item) => item.id === analysis.id ? updatedAnalysis : item);
    if (!saveData()) {
      data.jobs = previousJobs;
      data.jobAnalyses = previousAnalyses;
      return;
    }
    renderJobs();
    renderJobAnalysis(updatedAnalysis);
    showToast(duplicate ? "Análise vinculada à vaga existente; dados e histórico foram preservados." : "Oportunidade adicionada ao acompanhamento.");
  }

  function handleJobAnalysisAction(event) {
    const button = event.target.closest("[data-analysis-action]");
    if (!button) return;
    const { analysisAction: action, id } = button.dataset;
    const analysis = data.jobAnalyses.find((item) => item.id === id);
    if (!analysis) return;
    if (action === "delete") {
      if (!window.confirm(`Excluir a análise de "${analysis.title || "vaga sem título"}"? A vaga vinculada e o histórico de candidaturas não serão removidos.`)) return;
      const previous = data.jobAnalyses;
      data.jobAnalyses = data.jobAnalyses.filter((item) => item.id !== id);
      if (saveData()) {
        if (activeJobAnalysisId === id) {
          activeJobAnalysisId = "";
          jobAnalysisResult.replaceChildren();
          jobAnalysisResult.hidden = true;
        }
        renderSavedJobAnalyses();
        showToast("Análise excluída. Vagas e candidaturas foram mantidas.");
      } else data.jobAnalyses = previous;
      return;
    }
    if (action === "edit" || action === "open") {
      activeJobAnalysisId = analysis.id;
      setAnalysisFormValues(analysis);
      jobAnalysisStatus.textContent = "Análise carregada. Edite os campos e execute novamente para atualizar o resultado.";
      renderJobAnalysis(analysis);
      document.querySelector("#job-analysis-url").focus();
      return;
    }
    const targetStatus = action === "interesting" ? "interesting" : action;
    trackJobAnalysis(analysis, targetStatus);
  }

  function initializeJobAnalysis() {
    jobAnalysisForm.addEventListener("submit", submitJobAnalysis);
    document.querySelector("#job-analysis-url").addEventListener("invalid", () => {
      jobAnalysisStatus.textContent = "O link precisa ser uma URL válida. Use o formato https://site.com/vaga.";
    });
    jobAnalysisForm.addEventListener("input", (event) => {
      if (event.target.id === "job-analysis-description") jobAnalysisForm.dataset.method = "manual";
      if (event.target.id === "job-analysis-url") jobAnalysisForm.dataset.canonicalUrl = "";
    });
    jobAnalysisResult.addEventListener("click", handleJobAnalysisAction);
    document.querySelector("#saved-job-analyses-list").addEventListener("click", handleJobAnalysisAction);
    document.querySelector("#new-job-analysis-button").addEventListener("click", () => {
      const hasUnsavedInput = [...new FormData(jobAnalysisForm).values()].some((value) => String(value).trim());
      if (hasUnsavedInput && !window.confirm("Iniciar uma nova análise limpará os campos atuais. As análises já salvas e as vagas acompanhadas serão mantidas. Continuar?")) return;
      jobAnalysisForm.reset();
      jobAnalysisForm.dataset.method = "manual";
      jobAnalysisForm.dataset.canonicalUrl = "";
      activeJobAnalysisId = "";
      document.querySelector("#job-analysis-manual").open = false;
      jobAnalysisResult.replaceChildren();
      jobAnalysisResult.hidden = true;
      jobAnalysisStatus.textContent = "Informe um link ou cole a descrição para começar. As análises salvas permanecem disponíveis abaixo.";
      document.querySelector("#job-analysis-url").focus();
    });
    renderSavedJobAnalyses();
  }

  function filterDiscoveredJobs(jobs) {
    const searchTerms = normalize(jobSearchQuery.value).split(/\s+/).filter(Boolean);
    const titleFilter = normalize(document.querySelector("#job-title-filter").value);
    const levelFilter = document.querySelector("#job-level-filter").value;
    const arrangementFilter = document.querySelector("#job-arrangement-filter").value;
    const locationFilter = normalize(document.querySelector("#job-location-filter").value);
    const countryFilter = document.querySelector("#job-country-filter").value;
    const includeRemoteForRegion = document.querySelector("#job-include-remote-filter").checked;
    const dateDays = Number(document.querySelector("#job-date-filter").value || 0);
    const minimumFit = Number(document.querySelector("#job-fit-filter").value || 0);
    const dateFloor = dateDays ? Date.now() - dateDays * 24 * 60 * 60 * 1000 : 0;
    return jobs.filter((job) => {
      if (job.isPublishedFeed && searchTerms.length) {
        const searchableText = normalize([
          job.title, job.company, job.description, job.location,
          ...job.requirements, ...job.skills, ...job.tools, ...job.stack, ...job.categories
        ].join(" "));
        if (!searchTerms.every((term) => searchableText.includes(term))) return false;
      }
      if (titleFilter && !normalize(job.title).includes(titleFilter)) return false;
      if (levelFilter && job.level !== levelFilter) return false;
      if (arrangementFilter && (job.arrangement || "unknown") !== arrangementFilter) return false;
      const geography = getOpportunityGeography(job);
      if (countryFilter === "Brazil" && geography.status === "international") return false;
      if (locationFilter) {
        const locationText = normalize([job.location, ...(job.locationTerms || [])].join(" "));
        const regionMatches = locationText.includes(locationFilter);
        const remoteBrazilIncluded = includeRemoteForRegion && job.arrangement === "remote" && geography.acceptsBrazil;
        if (!regionMatches && !remoteBrazilIncluded && geography.status !== "unknown") return false;
      }
      if (dateFloor && (!job.postedAt || Date.parse(job.postedAt) < dateFloor)) return false;
      if (minimumFit) {
        const fit = getOpportunityFit(job);
        if (fit.score === null || fit.score < minimumFit) return false;
      }
      return true;
    });
  }

  function renderOpportunityDetails(job) {
    const fit = getOpportunityFit(job);
    const geography = getOpportunityGeography(job);
    const links = job.sourceLinks.map((link) => {
      const isSafe = safeUrl(link.url);
      const actionLabel = link.name === "Himalayas" ? "Abrir candidatura na Himalayas" : `Ver anúncio em ${link.name}`;
      return isSafe ? `<a class="button button-outline" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actionLabel)} ↗</a>` : "";
    }).join("");
    const sourceNames = [...new Set(job.sourceLinks.map((link) => link.name))].join(", ");
    const posted = job.postedAt ? `Publicado em ${new Date(job.postedAt).toLocaleDateString("pt-BR")}` : "Data de publicação não informada";
    const sourceTerms = [
      ["Requisitos", job.requirements],
      ["Competências", job.skills],
      ["Ferramentas", job.tools],
      ["Tecnologias", job.stack],
      ["Áreas", job.categories]
    ].filter(([, terms]) => terms.length).map(([label, terms]) =>
      `<section><strong>${escapeHtml(label)}</strong><div class="profile-tags">${terms.map((term) => `<span class="profile-tag">${escapeHtml(term)}</span>`).join("")}</div></section>`
    ).join("");
    const locationDetails = job.locationTerms.length > 5
      ? `<details class="discovered-job-terms"><summary>Ver todos os países permitidos</summary><p>${escapeHtml(job.locationTerms.join(", "))}</p></details>`
      : "";
    const meta = [
      job.locationDisplay || job.location ? `<span>${escapeHtml(job.locationDisplay || job.location)}</span>` : "",
      job.arrangement && `<span>${escapeHtml({ remote: "Remota", hybrid: "Híbrida", onsite: "Presencial" }[job.arrangement])}</span>`,
      job.seniority && `<span>${escapeHtml(seniorityLabel(job.seniority))}</span>`,
      job.contractType && `<span>${escapeHtml(job.contractType)}</span>`,
      job.salary && `<span>${escapeHtml(job.salary)}</span>`,
      `<span>${escapeHtml(geography.label)}</span>`,
      `<span>${escapeHtml(posted)}</span>`,
      job.expiresAt && `<span>Expira em ${escapeHtml(new Date(job.expiresAt).toLocaleDateString("pt-BR"))}</span>`,
      `<span>Listada pela fonte</span>`
    ].filter(Boolean).join("");
    const dimensions = fit.dimensions.map((dimension) =>
      `<li>${escapeHtml(dimension.label)} (${Math.round(dimension.score * 100)}%)</li>`).join("");
    const skillReview = fit.reviewSkills.length
      ? `<p><strong>Sem evidências suficientes no perfil para verificar:</strong> ${escapeHtml(fit.reviewSkills.join(", "))}. Isso não significa que o requisito não seja atendido.</p>`
      : "";
    const mandatoryReview = fit.unverifiedMandatory.length
      ? `<p><strong>Requisitos que a fonte sinalizou como obrigatórios, sem evidência no perfil:</strong> ${escapeHtml(fit.unverifiedMandatory.join(", "))}. O fit foi limitado a 49% para não ocultá-los; confira o anúncio, pois ausência no currículo não prova que não sejam atendidos.</p>`
      : "";
    return `<article class="discovered-job-card">
      <div class="discovered-job-heading">
        <div><h4>${escapeHtml(job.title)}</h4><p class="job-company">${escapeHtml(job.company || "Empresa não informada")}</p></div>
        <span class="discovered-source">${escapeHtml(sourceNames)}</span>
      </div>
      <div class="discovered-job-meta">${meta}</div>
      <div class="discovered-fit">
        <strong>${fit.score === null ? "Compatibilidade não calculada: complete seu perfil" : `Fit estimado: ${fit.score}%`}</strong>
        ${fit.score === null ? "" : `<div class="match-meter" role="img" aria-label="Fit estimado ${fit.score}%"><span style="width:${fit.score}%"></span></div>`}
        ${dimensions ? `<ul>${dimensions}</ul>` : ""}
        ${skillReview}${mandatoryReview}
        ${!fit.profileHasData ? "<p>Preencha competências, cargo, experiência, localização ou formação para obter uma comparação. A busca básica continua disponível.</p>" : ""}
      </div>
      ${locationDetails}
      ${sourceTerms ? `<details class="discovered-job-terms"><summary>Requisitos, competências, ferramentas e áreas informados pela fonte</summary><div>${sourceTerms}</div></details>` : ""}
      ${job.description ? `<details class="discovered-job-description"><summary>Ver descrição ou resumo</summary><p>${escapeHtml(job.description)}</p></details>` : ""}
      <div class="discovered-job-actions"><button class="button button-primary" type="button" data-discovered-track="${escapeHtml(job.id)}">Adicionar ao acompanhamento</button>${links}</div>
    </article>`;
  }

  function renderDiscoveredJobCard(job) {
    const fit = getOpportunityFit(job);
    const geography = getOpportunityGeography(job);
    const sourceNames = [...new Set((job.sourceLinks || []).map((link) => link.name))].join(", ") || job.sourceName;
    const relevantTerms = [...new Set([...job.skills, ...job.tools, ...job.requirements, ...job.stack])].slice(0, 3);
    const location = job.locationDisplay || job.location;
    const postedTime = Date.parse(job.postedAt || "");
    const posted = Number.isFinite(postedTime) ? new Date(postedTime).toLocaleDateString("pt-BR") : "";
    return `<article class="discovered-job-card compact-job-card">
      <div class="discovered-job-heading">
        <div class="compact-job-title"><h4 title="${escapeHtml(job.title)}">${escapeHtml(job.title)}</h4><p class="job-company">${escapeHtml(job.company || "Empresa não informada")}</p></div>
        <span class="discovered-source">${escapeHtml(sourceNames)}</span>
      </div>
      <div class="discovered-job-meta">${location ? `<span>${escapeHtml(location)}</span>` : ""}${job.arrangement ? `<span>${escapeHtml({ remote: "Remota", hybrid: "Híbrida", onsite: "Presencial" }[job.arrangement])}</span>` : ""}${posted ? `<span>Publicada em ${escapeHtml(posted)}</span>` : ""}</div>
      <span class="job-geography-badge job-geography-${geography.status}">${escapeHtml(geography.label)}</span>
      <strong class="compact-job-fit">${fit.score === null ? "Fit inconclusivo" : `Fit estimado: ${fit.score}%`}</strong>
      ${relevantTerms.length ? `<div class="criteria-list">${relevantTerms.map((term) => `<span class="criterion">${escapeHtml(term)}</span>`).join("")}</div>` : ""}
      <button class="button button-outline compact-job-details-button" type="button" data-discovered-details="${escapeHtml(job.id)}">Ver detalhes</button>
    </article>`;
  }

  function openDiscoveredJobDetails(id) {
    const job = discoveredJobs.find((item) => item.id === id);
    if (!job) return;
    document.querySelector("#job-details-title").textContent = job.title;
    jobDetailsContent.innerHTML = renderOpportunityDetails(job);
    jobDetailsDialog.showModal();
    document.querySelector("#close-job-details").focus();
  }

  function trackDiscoveredJob(id) {
    const opportunity = discoveredJobs.find((item) => item.id === id);
    if (!opportunity) return;
    const url = safeUrl(opportunity.url);
    const existing = data.jobs.find((job) =>
      (url && canonicalJobUrl(job.url) === canonicalJobUrl(url))
      || (opportunity.company && normalize(job.title) === normalize(opportunity.title)
        && normalize(job.company) === normalize(opportunity.company)));
    if (existing) {
      statusFilter.value = "all";
      setDashboardView("applications");
      const card = [...jobsList.children].find((item) => item.dataset.id === existing.id);
      card?.scrollIntoView({ block: "nearest" });
      showToast("Esta oportunidade já está no acompanhamento.");
      jobDetailsDialog.close();
      return;
    }
    const timestamp = new Date().toISOString();
    const trackedJob = {
      id: createId(),
      title: opportunity.title,
      company: opportunity.company,
      location: opportunity.location || opportunity.locationDisplay,
      level: opportunity.seniority,
      url: url || "",
      status: "saved",
      requirements: [...new Set([...opportunity.requirements, ...opportunity.skills, ...opportunity.tools, ...opportunity.stack])].join("\n"),
      notes: [
        `Adicionada da fonte ${opportunity.sourceName}.`,
        opportunity.description,
        opportunity.salary ? `Faixa salarial informada: ${opportunity.salary}` : ""
      ].filter(Boolean).join("\n\n"),
      createdAt: timestamp,
      history: [{ at: timestamp, event: `Oportunidade adicionada da fonte ${opportunity.sourceName}`, status: "saved" }]
    };
    data.jobs.unshift(trackedJob);
    if (!saveData()) {
      data.jobs.shift();
      return;
    }
    statusFilter.value = "all";
    setDashboardView("applications");
    jobDetailsDialog.close();
    showToast("Oportunidade adicionada como vaga salva. Nenhuma candidatura foi enviada.");
  }

  function handleDiscoveredDetailsAction(event) {
    const button = event.target.closest("[data-discovered-track]");
    if (button) trackDiscoveredJob(button.dataset.discoveredTrack);
  }

  function renderDiscoveredJobs() {
    const filtered = filterDiscoveredJobs(discoveredJobs).sort((left, right) => {
      const geographyDifference = getOpportunityGeography(left).rank - getOpportunityGeography(right).rank;
      if (geographyDifference) return geographyDifference;
      const leftFit = getOpportunityFit(left).score;
      const rightFit = getOpportunityFit(right).score;
      if (leftFit !== rightFit) return (rightFit ?? -1) - (leftFit ?? -1);
      return Date.parse(right.postedAt || 0) - Date.parse(left.postedAt || 0);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / JOB_RESULTS_PAGE_SIZE));
    discoveredJobsPage = Math.min(discoveredJobsPage, totalPages - 1);
    const visible = filtered.slice(discoveredJobsPage * JOB_RESULTS_PAGE_SIZE, (discoveredJobsPage + 1) * JOB_RESULTS_PAGE_SIZE);
    document.querySelector("#job-results-count").textContent = `${filtered.length} ${filtered.length === 1 ? "oportunidade" : "oportunidades"}`;
    jobSearchResults.innerHTML = visible.map(renderDiscoveredJobCard).join("");
    const pagination = document.querySelector("#job-results-pagination");
    pagination.hidden = filtered.length <= JOB_RESULTS_PAGE_SIZE;
    document.querySelector("#job-results-page").textContent = `Página ${discoveredJobsPage + 1} de ${totalPages}`;
    document.querySelector("#job-results-previous").disabled = discoveredJobsPage === 0;
    document.querySelector("#job-results-next").disabled = discoveredJobsPage >= totalPages - 1;
    const region = document.querySelector("#job-location-filter").value.trim();
    const uncertainRegions = filtered.filter((job) => getOpportunityGeography(job).status === "unknown").length;
    document.querySelector("#job-location-filter-status").textContent = region
      ? `Região “${region}” aplicada localmente quando a fonte informa cidade/estado. Vagas remotas elegíveis para o Brasil permanecem incluídas conforme a opção; ${uncertainRegions} resultado(s) sem evidência geográfica suficiente exigem confirmação manual.`
      : "A região é filtrada localmente. Resultados sem informação suficiente ficam sinalizados para confirmação.";
    if (!filtered.length && discoveredJobs.length) {
      jobSearchResults.innerHTML = '<p class="job-search-empty">Nenhuma oportunidade corresponde aos filtros atuais.</p>';
    } else if (!discoveredJobs.length) {
      jobSearchResults.innerHTML = '<p class="job-search-empty">Ainda não há resultados disponíveis. Atualize a lista publicada ou consulte as fontes ao vivo.</p>';
    }

  }

  function isPublishedFeedStale() {
    const updatedAt = Date.parse(publishedFeedMetadata?.updatedAt || "");
    return !Number.isFinite(updatedAt) || Date.now() - updatedAt > JOB_FEED_STALE_AFTER_MS;
  }

  function normalizePublishedFeedJob(job) {
    if (!job || typeof job !== "object" || !textValue(job.title).trim()) return null;
    const url = safeUrl(job.url);
    if (!url) return null;
    const sourceLinks = Array.isArray(job.sourceLinks)
      ? job.sourceLinks.map((link) => ({
        name: textValue(link?.name),
        url: safeUrl(link?.url)
      })).filter((link) => link.name && link.url)
      : [];
    if (!sourceLinks.length) sourceLinks.push({ name: textValue(job.sourceName) || "Fonte não informada", url });
    const list = (value) => Array.isArray(value) ? value.map((item) => textValue(item)).filter(Boolean) : [];
    return {
      ...job,
      id: textValue(job.id) || url,
      title: textValue(job.title),
      company: textValue(job.company),
      description: textValue(job.description),
      requirements: list(job.requirements),
      skills: list(job.skills),
      tools: list(job.tools),
      stack: list(job.stack),
      categories: list(job.categories),
      educationRequirements: list(job.educationRequirements),
      location: textValue(job.location),
      locationTerms: list(job.locationTerms),
      locationCountries: list(job.locationCountries),
      eligibleCountries: list(job.eligibleCountries),
      arrangement: ["remote", "hybrid", "onsite"].includes(job.arrangement) ? job.arrangement : "",
      url,
      sourceId: textValue(job.sourceId) || "unknown",
      sourceName: textValue(job.sourceName) || sourceLinks[0].name,
      isPublishedFeed: true,
      sourceLinks,
      mandatoryRequirements: list(job.mandatoryRequirements)
    };
  }

  async function refreshPublishedJobFeed() {
    const button = document.querySelector("#refresh-published-feed-button");
    if (jobSearchBusy) {
      jobSearchStatus.textContent = "A consulta ao vivo está em andamento. Aguarde antes de atualizar a lista publicada.";
      return;
    }
    if (location.protocol === "file:") {
      publishedFeedError = "O feed publicado só pode ser carregado quando o aplicativo está hospedado por HTTP/HTTPS, como no GitHub Pages.";
      renderSourceStatuses(discoveredSources);
      jobSearchStatus.textContent = publishedFeedError;
      return;
    }
    button.disabled = true;
    jobSearchStatus.textContent = "Carregando a última versão publicada do feed. Isso não executa uma nova consulta às fontes.";
    publishedFeedError = "";
    const feedUrl = new URL(JOB_FEED_URL);
    feedUrl.searchParams.set("v", String(Date.now()));
    try {
      const feed = await fetchJson(feedUrl.href, "Feed de vagas publicado");
      if (!feed || feed.version !== 1 || !Array.isArray(feed.jobs) || !Array.isArray(feed.sources)) {
        throw new Error("O arquivo publicado não tem o formato esperado.");
      }
      publishedFeedJobs = feed.jobs.map(normalizePublishedFeedJob).filter(Boolean)
        .filter((job) => !isJobExpired(job));
      publishedFeedMetadata = {
        updatedAt: textValue(feed.updatedAt),
        lastAttemptAt: textValue(feed.lastAttemptAt),
        lastAttemptStatus: textValue(feed.lastAttemptStatus),
        lastAttemptMessage: textValue(feed.lastAttemptMessage),
        sources: feed.sources
      };
      const cache = readOpportunityCache();
      renderOpportunityCache(cache || { sources: [], checkedAt: 0 }, publishedFeedMetadata.lastAttemptStatus === "error"
        ? `O feed está disponível, mas a última coleta falhou em ${formatCheckedAt(publishedFeedMetadata.lastAttemptAt)}. Os dados anteriores foram mantidos.`
        : `Feed publicado carregado (${publishedFeedJobs.length} vagas). A última coleta foi em ${formatCheckedAt(publishedFeedMetadata.updatedAt)}; esta ação não consultou novamente as fontes.`);
    } catch (error) {
      console.error("Não foi possível carregar o feed de vagas publicado.", error);
      publishedFeedError = error.message || "Falha ao carregar o feed publicado.";
      renderSourceStatuses(discoveredSources);
      jobSearchStatus.textContent = `${publishedFeedError} A consulta ao vivo continua disponível; nenhum currículo ou dado pessoal foi enviado.`;
    } finally {
      button.disabled = false;
    }
  }

  function renderOpportunityCache(cache, message) {
    discoveredJobsPage = 0;
    discoveredSources = cache.sources || [];
    discoveredJobs = deduplicateOpportunities([
      ...publishedFeedJobs,
      ...discoveredSources.flatMap((source) => source.jobs || [])
    ])
      .filter((job) => !isJobExpired(job));
    renderSourceStatuses(discoveredSources);
    const timestamps = [
      publishedFeedMetadata?.updatedAt ? `Feed publicado: ${formatCheckedAt(publishedFeedMetadata.updatedAt)}` : "",
      cache.checkedAt ? `Última consulta ao vivo: ${formatCheckedAt(cache.checkedAt)}` : ""
    ].filter(Boolean);
    document.querySelector("#job-last-checked").textContent = timestamps.join(" · ");
    jobSearchStatus.textContent = message;
    renderDiscoveredJobs();
  }

  async function updateDiscoveredJobs(event) {
    event?.preventDefault();
    if (jobSearchBusy) return;
    jobSearchBusy = true;
    const updateButton = document.querySelector("#update-jobs-button");
    updateButton.disabled = true;
    jobSearchStatus.textContent = "Consultando as fontes. Cada uma pode responder ou falhar de forma independente…";
    jobSourceStatus.replaceChildren();
    const query = jobSearchQuery.value.trim();
    const queries = buildSearchQueries(query);
    const country = document.querySelector("#job-country-filter").value === "Brazil" ? "Brazil" : "";
    const queryKey = JSON.stringify({ queries, country });
    const previousCache = readOpportunityCache();
    const seniority = normalizeSeniority(data.resume.level);
    const previousQueryMatches = previousCache && (
      previousCache.queryKey === queryKey
      || (country === "Brazil" && previousCache.queryKey === JSON.stringify(queries))
    );
    const previousSources = new Map(
      previousQueryMatches && previousCache.seniority === seniority
        ? previousCache.sources.map((source) => [source.id, source])
        : []
    );
    const connectors = [
      { id: "himalayas", name: "Himalayas", query: (terms) => queryHimalayas(terms, country) },
      { id: "4dayweek", name: "4dayweek.io", query: (terms) => queryFourDayWeek(terms, country) }
    ];
    const checkedAt = Date.now();
    try {
      const results = await Promise.all(connectors.map(async (connector) => {
        try {
          const result = await connector.query(queries);
          const jobs = result.jobs.filter((job) => !isJobExpired(job))
            .map((job) => ({ ...job, lastCheckedAt: checkedAt, status: "listed" }));
          return {
            id: connector.id,
            name: connector.name,
            status: result.partial ? "partial" : jobs.length ? "success" : "empty",
            jobs,
            total: result.total,
            totals: result.totals,
            successAt: checkedAt,
            message: ""
          };
        } catch (error) {
          console.error(`A consulta à fonte ${connector.name} falhou.`, error);
          const previous = previousSources.get(connector.id);
          const cachedIsRecent = previous?.successAt && checkedAt - previous.successAt <= JOB_SEARCH_CACHE_TTL_MS;
          return cachedIsRecent
            ? { ...previous, status: "cached", message: error.message }
            : { id: connector.id, name: connector.name, status: "error", jobs: [], successAt: 0, message: error.message || "Fonte indisponível." };
        }
      }));
      const cache = { checkedAt, query, queryKey, queries, country, seniority, sources: results };
      const termMessage = queries.length > 1 ? ` Termos consultados: ${queries.join(" e ")}.` : "";
      renderOpportunityCache(cache, results.some((source) => ["success", "partial", "empty"].includes(source.status))
        ? `Consulta concluída.${termMessage} A data exibida é a última verificação, não a publicação de cada vaga.`
        : "Nenhuma fonte respondeu. Os resultados anteriores ainda válidos foram preservados, quando disponíveis.");
      if (!saveOpportunityCache(cache)) {
        jobSearchStatus.textContent += " Não foi possível manter a consulta disponível após recarregar esta aba.";
      }
    } finally {
      jobSearchBusy = false;
      updateButton.disabled = false;
    }
  }

  function consultAvailableJobs() {
    const cache = readOpportunityCache();
    if (!cache) {
      renderOpportunityCache({ sources: [], checkedAt: 0 }, "Não há resultados de consulta ao vivo nesta aba. O feed publicado permanece disponível; use “Consultar fontes ao vivo” para atualizar também as APIs.");
      return;
    }
    jobSearchQuery.value = cache.query || "";
    const terms = Array.isArray(cache.queries) ? cache.queries.filter(Boolean) : [];
    const termMessage = terms.length > 1 ? ` (termos: ${terms.join(" e ")})` : "";
    const countryMessage = cache.country === "" ? " (todos os países; Brasil priorizado)" : " (Brasil)";
    renderOpportunityCache(cache, `Resultados da consulta de ${formatCheckedAt(cache.checkedAt)} para “${cache.query || "busca ampla"}”${termMessage}${countryMessage} carregados desta aba.`);
  }

  function applySearchDefaults() {
    const role = data.resume.targetRole || data.resume.currentRole;
    const profileTerms = [
      ...splitEvidenceTerms(resumeSkills(data.resume)),
      ...resumeTools(data.resume).map((tool) => tool.name)
    ];
    jobSearchQuery.value = role || profileTerms.slice(0, 2).join(" ");
  }

  function readJobLocationPreferences() {
    try {
      const raw = localStorage.getItem(JOB_LOCATION_PREFERENCES_KEY);
      if (!raw) return null;
      const preferences = JSON.parse(raw);
      if (!preferences || typeof preferences !== "object") throw new Error("Formato de preferências de localização inválido.");
      return {
        country: preferences.country === "all" ? "all" : "Brazil",
        region: typeof preferences.region === "string" ? preferences.region.slice(0, 100) : "",
        includeRemote: preferences.includeRemote !== false
      };
    } catch (error) {
      console.error("Não foi possível carregar as preferências de localização da busca.", error);
      return null;
    }
  }

  function saveJobLocationPreferences() {
    const preferences = {
      country: document.querySelector("#job-country-filter").value,
      region: document.querySelector("#job-location-filter").value.trim().slice(0, 100),
      includeRemote: document.querySelector("#job-include-remote-filter").checked
    };
    try {
      localStorage.setItem(JOB_LOCATION_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Não foi possível salvar as preferências de localização da busca.", error);
      jobSearchStatus.textContent = "Não foi possível salvar a preferência de localização neste navegador; ela será mantida apenas até esta página ser fechada.";
    }
  }

  function updateExternalJobSearchLinks() {
    const query = jobSearchQuery.value.trim();
    const region = document.querySelector("#job-location-filter").value.trim();
    const isBrazilPriority = document.querySelector("#job-country-filter").value === "Brazil";
    const location = region || (isBrazilPriority ? "Brazil" : "");
    const brazilianLocation = region || (isBrazilPriority ? "Brasil" : "");
    const makeUrl = (base, values) => {
      const url = new URL(base);
      for (const [key, value] of Object.entries(values)) {
        if (value) url.searchParams.set(key, value);
      }
      return url.href;
    };
    document.querySelector("#search-link-linkedin").href = makeUrl("https://www.linkedin.com/jobs/search/", {
      keywords: query,
      location
    });
    document.querySelector("#search-link-indeed").href = makeUrl("https://br.indeed.com/jobs", { q: query, l: brazilianLocation });
    document.querySelector("#search-link-glassdoor").href = makeUrl("https://www.glassdoor.com/Job/jobs.htm", {
      "sc.keyword": query,
      locKeyword: location
    });
    document.querySelector("#search-link-adzuna").href = makeUrl("https://www.adzuna.com.br/search", { q: query, loc: brazilianLocation });
    const googleQuery = ["vagas", query, region || (isBrazilPriority ? "Brasil" : "")].filter(Boolean).join(" ");
    document.querySelector("#search-link-google").href = makeUrl("https://www.google.com/search", { q: googleQuery });
  }

  function initializeJobDiscovery() {
    applySearchDefaults();
    const locationPreferences = readJobLocationPreferences();
    if (locationPreferences) {
      document.querySelector("#job-country-filter").value = locationPreferences.country;
      document.querySelector("#job-location-filter").value = locationPreferences.region;
      document.querySelector("#job-include-remote-filter").checked = locationPreferences.includeRemote;
    }
    updateExternalJobSearchLinks();
    jobSearchForm.addEventListener("submit", updateDiscoveredJobs);
    document.querySelector("#available-jobs-button").addEventListener("click", consultAvailableJobs);
    document.querySelector("#job-results-previous").addEventListener("click", () => {
      discoveredJobsPage = Math.max(0, discoveredJobsPage - 1);
      renderDiscoveredJobs();
    });
    document.querySelector("#job-results-next").addEventListener("click", () => {
      discoveredJobsPage += 1;
      renderDiscoveredJobs();
    });
    for (const selector of [
      "#job-title-filter", "#job-level-filter", "#job-arrangement-filter", "#job-location-filter", "#job-country-filter", "#job-include-remote-filter",
      "#job-date-filter", "#job-fit-filter", "#job-modality-preference"
    ]) {
      const resetAndRender = () => {
        discoveredJobsPage = 0;
        renderDiscoveredJobs();
      };
      document.querySelector(selector).addEventListener("input", resetAndRender);
      document.querySelector(selector).addEventListener("change", resetAndRender);
    }
    for (const selector of ["#job-location-filter", "#job-country-filter", "#job-include-remote-filter"]) {
      const element = document.querySelector(selector);
      element.addEventListener("change", () => {
        saveJobLocationPreferences();
        updateExternalJobSearchLinks();
      });
      if (selector === "#job-location-filter") {
        element.addEventListener("input", updateExternalJobSearchLinks);
      }
    }
    jobSearchQuery.addEventListener("input", updateExternalJobSearchLinks);
    document.querySelector("#job-location-clear").addEventListener("click", () => {
      document.querySelector("#job-country-filter").value = "Brazil";
      document.querySelector("#job-location-filter").value = "";
      saveJobLocationPreferences();
      updateExternalJobSearchLinks();
      discoveredJobsPage = 0;
      renderDiscoveredJobs();
      jobSearchStatus.textContent = "Região removida. A busca volta a priorizar o Brasil. Atualize o feed publicado para carregar o JSON mais recente ou consulte as fontes ao vivo.";
    });
    jobSearchQuery.addEventListener("input", () => {
      if (!jobSearchQuery.value.trim()) jobSearchQuery.placeholder = "Busca ampla; pode retornar muitas vagas";
      discoveredJobsPage = 0;
      renderDiscoveredJobs();
    });
    jobSearchResults.addEventListener("click", (event) => {
      const button = event.target.closest("[data-discovered-details]");
      if (button) openDiscoveredJobDetails(button.dataset.discoveredDetails);
    });
    document.querySelector("#refresh-published-feed-button").addEventListener("click", refreshPublishedJobFeed);
    if (location.protocol !== "file:") {
      refreshPublishedJobFeed();
    } else {
      renderDiscoveredJobs();
      jobSearchStatus.textContent = "O feed publicado carrega quando o aplicativo está hospedado em HTTP/HTTPS (por exemplo, GitHub Pages). A consulta ao vivo continua disponível nesta cópia local.";
    }
  }

  function setDashboardView(view, focusTab = false) {
    const selectedView = ["profile", "opportunities", "applications"].includes(view) ? view : "opportunities";
    const workspace = document.querySelector(".workspace");
    const profilePanel = document.querySelector(".resume-panel");
    const jobsPanel = document.querySelector(".jobs-panel");
    const opportunitiesContent = document.querySelector("#dashboard-opportunities-content");
    const applicationsContent = document.querySelector("#dashboard-applications-content");
    workspace.dataset.dashboardView = selectedView;
    profilePanel.hidden = selectedView !== "profile";
    jobsPanel.hidden = selectedView === "profile";
    opportunitiesContent.hidden = selectedView !== "opportunities";
    applicationsContent.hidden = selectedView !== "applications";
    document.querySelector("#new-job-button").hidden = selectedView !== "applications";
    for (const tab of document.querySelectorAll(".dashboard-tab")) {
      const isSelected = tab.dataset.dashboardView === selectedView;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      if (isSelected && focusTab) tab.focus();
    }
    if (selectedView === "opportunities") renderDiscoveredJobs();
    if (selectedView === "applications") renderJobs();
  }

  function initializeDashboardNavigation() {
    const tabs = [...document.querySelectorAll(".dashboard-tab")];
    for (const tab of tabs) {
      tab.addEventListener("click", () => setDashboardView(tab.dataset.dashboardView));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const currentIndex = tabs.indexOf(tab);
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (currentIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        setDashboardView(tabs[nextIndex].dataset.dashboardView, true);
      });
    }
    setDashboardView(document.querySelector(".workspace").dataset.dashboardView);
    document.querySelector("#close-job-details").addEventListener("click", () => jobDetailsDialog.close());
    jobDetailsContent.addEventListener("click", handleDiscoveredDetailsAction);
    jobDetailsDialog.addEventListener("click", (event) => {
      if (event.target === jobDetailsDialog) jobDetailsDialog.close();
    });
  }

  function renderJobs() {
    renderDiscoveredJobs();
    const filter = statusFilter.value;
    const filteredJobs = data.jobs.filter((job) => filter === "all" || job.status === filter);
    document.querySelector("#stat-total").textContent = String(data.jobs.length);
    document.querySelector("#stat-active").textContent = String(data.jobs.filter((job) => ["planned", "applied", "interview", "offer"].includes(job.status)).length);
    document.querySelector("#stat-interviews").textContent = String(data.jobs.filter((job) => job.status === "interview").length);
    document.querySelector("#job-count").textContent = `${filteredJobs.length} ${filteredJobs.length === 1 ? "vaga" : "vagas"}`;
    emptyState.hidden = data.jobs.length > 0;
    jobsList.hidden = filteredJobs.length === 0;
    if (data.jobs.length && filteredJobs.length === 0) {
      jobsList.innerHTML = '<p class="section-intro">Nenhuma vaga com este filtro.</p>';
      jobsList.hidden = false;
      return;
    }
    jobsList.innerHTML = filteredJobs.map(renderJob).join("");
    jobsList.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", handleJobAction);
    });
  }

  function renderJob(job) {
    const match = getMatch(job);
    const statusClass = job.status === "saved" ? "" : ` status-${job.status}`;
    const requirements = match.requirements.slice(0, 3);
    const location = [job.location, job.level].filter(Boolean).join(" · ");
    return `<article class="job-card compact-job-card" data-id="${escapeHtml(job.id)}">
      <div class="job-card-head"><div class="compact-job-title"><h3 title="${escapeHtml(job.title)}">${escapeHtml(job.title)}</h3><p class="job-company">${escapeHtml(job.company || "Empresa não informada")}</p></div><span class="status-pill${statusClass}">${escapeHtml(STATUSES[job.status] || STATUSES.saved)}</span></div>
      ${location ? `<p class="compact-job-location">${escapeHtml(location)}</p>` : ""}
      <strong class="compact-job-fit">${match.score === null ? "Fit não calculado" : `Fit estimado: ${match.score}%`}</strong>
      ${requirements.length ? `<div class="criteria-list">${requirements.map((requirement) => `<span class="criterion ${match.matched.includes(requirement) ? "met" : "missed"}">${match.matched.includes(requirement) ? "✓ " : "○ "}${escapeHtml(requirement)}</span>`).join("")}</div>` : ""}
      <button class="button button-outline compact-job-details-button" type="button" data-action="details" data-id="${escapeHtml(job.id)}">Ver detalhes</button>
    </article>`;
  }

  function renderJobDetails(job) {
    const match = getMatch(job);
    const statusClass = job.status === "saved" ? "" : ` status-${job.status}`;
    const history = job.history?.length
      ? `<details class="job-history"><summary>Histórico de acompanhamento</summary><ul>${job.history.slice().reverse().map((item) =>
        `<li><time>${escapeHtml(item.at ? new Date(item.at).toLocaleString("pt-BR") : "Data não informada")}</time> — ${escapeHtml(item.event || "Atualização")}</li>`).join("")}</ul></details>`
      : "";
    const criteria = match.criteria.length
      ? match.criteria.map((criterion) => `<span class="criterion">${escapeHtml(criterion.label)}</span>`).join("")
      : '<span class="criterion">Adicione requisitos ou informe seu nível/local para comparar.</span>';
    const requirements = match.requirements.length
      ? match.requirements.map((requirement) => `<span class="criterion ${match.matched.includes(requirement) ? "met" : "missed"}">${match.matched.includes(requirement) ? "✓ " : "○ "}${escapeHtml(requirement)}</span>`).join("")
      : "";
    const url = safeUrl(job.url);
    return `<article class="job-card" data-id="${escapeHtml(job.id)}">
      <div class="job-card-head"><div><h3>${escapeHtml(job.title)}</h3><p class="job-company">${escapeHtml(job.company || "Empresa não informada")}</p></div><span class="status-pill${statusClass}">${escapeHtml(STATUSES[job.status] || STATUSES.saved)}</span></div>
      <div class="job-meta">${job.location ? `<span>⌖ ${escapeHtml(job.location)}</span>` : ""}${job.level ? `<span>◈ ${escapeHtml(job.level)}</span>` : ""}</div>
      <div class="match-box"><div class="match-top"><strong>${match.score === null ? "Comparação não disponível" : `Compatibilidade estimada: ${match.score}%`}</strong><span>estimativa, não decisão</span></div>${match.score === null ? "" : `<div class="match-meter" aria-label="Compatibilidade ${match.score}%"><span style="width:${match.score}%"></span></div>`}<div class="criteria-list">${criteria}${requirements}</div></div>
      ${job.notes ? `<p class="job-notes">${escapeHtml(job.notes)}</p>` : ""}
      ${history}
      <div class="job-card-actions"><button class="button button-outline" type="button" data-action="edit" data-id="${escapeHtml(job.id)}">Editar</button><button class="button button-quiet" type="button" data-action="analyze" data-id="${escapeHtml(job.id)}">Prompt de análise</button><button class="button button-quiet" type="button" data-action="tailor" data-id="${escapeHtml(job.id)}">Prompt para currículo</button>${url ? `<a class="job-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir vaga ↗</a>` : ""}<button class="button button-quiet" type="button" data-action="delete" data-id="${escapeHtml(job.id)}" aria-label="Excluir ${escapeHtml(job.title)}">Excluir</button></div>
    </article>`;
  }

  function openJobDialog(job = null) {
    jobForm.reset();
    jobForm.elements.namedItem("id").value = job?.id || "";
    if (job) {
      for (const key of ["title", "company", "location", "level", "url", "status", "requirements", "notes"]) {
        jobForm.elements.namedItem(key).value = job[key] || (key === "status" ? "saved" : "");
      }
    } else {
      jobForm.elements.namedItem("status").value = "saved";
    }
    document.querySelector("#dialog-title").textContent = job ? "Editar vaga" : "Adicionar vaga";
    jobDialog.showModal();
    jobForm.elements.namedItem("title").focus();
  }

  function handleJobAction(event) {
    const { action, id } = event.currentTarget.dataset;
    const job = data.jobs.find((item) => item.id === id);
    if (!job) return;
    if (action === "details") {
      document.querySelector("#job-details-title").textContent = job.title;
      jobDetailsContent.innerHTML = renderJobDetails(job);
      jobDetailsContent.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", handleJobAction);
      });
      jobDetailsDialog.showModal();
      document.querySelector("#close-job-details").focus();
      return;
    }
    if (action === "edit") jobDetailsDialog.close();
    if (action === "edit") openJobDialog(job);
    if (action === "delete") {
      if (!window.confirm(`Excluir a vaga "${job.title}"?`)) return;
      data.jobs = data.jobs.filter((item) => item.id !== id);
      if (saveData()) {
        jobDetailsDialog.close();
        renderJobs();
      }
    }
    if (action === "analyze" || action === "tailor") copyPrompt(job, action);
  }

  function makePrompt(job, action) {
    const resume = data.resume;
    const pdfReference = composeOrganizedResume(resume) || resume.pdfOrganizedText || resume.pdfText;
    const resumeContent = [
      `Nome: ${resume.name || "[não informado]"}`,
      `Cargo atual: ${resume.currentRole || "[não informado]"}`,
      `Cargo desejado: ${resume.targetRole || "[não informado]"}`,
      `Localização: ${resume.location || "[não informada]"}`,
      `Nível: ${resume.level || "[não informado]"}`,
      `Resumo: ${resume.summary || "[não informado]"}`,
      `Competências: ${resumeSkills(resume) || "[não informadas]"}`,
      `Experiências: ${formatExperiences(resume.experienceEntries || []) || resume.experience || "[não informadas]"}`,
      `Formação: ${resume.education || "[não informada]"}`,
      `Cursos: ${resume.courses || "[não informados]"}`,
      `Certificações: ${resume.certifications || "[não informadas]"}`,
      `Ferramentas e softwares: ${formatResumeTools(resumeTools(resume)) || resume.tools || "[não informados]"}`,
      `Associações de proficiência a revisar: ${resumeToolReviewNotes(resume) || "[nenhuma]"}`,
      `Outras informações: ${resume.otherInfo || "[não informadas]"}`,
      `Currículo organizado ou texto original do PDF: ${pdfReference || "[não importado]"}`
    ].join("\n");
    const jobContent = [
      `Cargo: ${job.title}`,
      `Empresa: ${job.company || "[não informada]"}`,
      `Local: ${job.location || "[não informado]"}`,
      `Nível solicitado: ${job.level || "[não informado]"}`,
      `Requisitos informados: ${job.requirements || "[não informados]"}`,
      `Descrição/anotações: ${job.notes || "[não informadas]"}`
    ].join("\n");
    if (action === "analyze") {
      return `Atue como orientador(a) de carreira. Analise a vaga e meu perfil usando somente as informações abaixo. Não invente requisitos nem experiências. Separe: (1) requisitos explícitos da vaga; (2) evidências do meu perfil que correspondem; (3) lacunas ou pontos que não podem ser confirmados; (4) perguntas que devo esclarecer; (5) próximos passos. Explique seus critérios e incertezas, sem decidir por mim.\n\nVAGA:\n${jobContent}\n\nMEU PERFIL:\n${resumeContent}`;
    }
    return `Ajude a adaptar meu currículo para esta vaga sem inventar, exagerar ou afirmar competências e experiências que não estão no texto original. Preserve os fatos e datas, indique claramente qualquer sugestão que precise ser confirmada por mim e use palavras-chave da vaga apenas quando forem verdadeiras para meu perfil. Entregue: (1) sugestões de ajustes no resumo; (2) competências relevantes já comprovadas no perfil; (3) experiência reorganizada sem criar fatos; (4) lacunas e perguntas para eu responder. Não inclua dados que não forneci.\n\nVAGA:\n${jobContent}\n\nMEU CURRÍCULO:\n${resumeContent}`;
  }

  async function copyPrompt(job, action) {
    const prompt = makePrompt(job, action);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const temporary = document.createElement("textarea");
        temporary.value = prompt;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.append(temporary);
        temporary.select();
        const copied = document.execCommand("copy");
        temporary.remove();
        if (!copied) throw new Error("O navegador não permitiu copiar o texto.");
      }
      showToast("Prompt copiado. Revise os dados antes de colar no ChatGPT.");
    } catch (error) {
      console.error("Não foi possível copiar o prompt.", error);
      showToast("Não foi possível copiar. Tente novamente ou abra o aplicativo em um navegador atualizado.", true);
    }
  }

  resumeForm.addEventListener("input", () => {
    document.querySelector("#save-message").textContent = "Salvando…";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(updateResume, 350);
  });
  resumeForm.addEventListener("change", updateResume);
  resumeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(saveTimer);
    updateResume();
    showToast("Currículo salvo neste navegador.");
  });
  document.querySelector("#new-job-button").addEventListener("click", () => openJobDialog());
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  });
  document.querySelector("#empty-add-button").addEventListener("click", () => openJobDialog());
  document.querySelector("#close-dialog").addEventListener("click", () => jobDialog.close());
  document.querySelector("#cancel-dialog").addEventListener("click", () => jobDialog.close());
  jobDialog.addEventListener("click", (event) => {
    if (event.target === jobDialog) jobDialog.close();
  });
  jobForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!jobForm.reportValidity()) return;
    const formData = new FormData(jobForm);
    const id = String(formData.get("id") || "");
    const existing = data.jobs.find((job) => job.id === id);
    const job = {
      id: existing?.id || createId(),
      title: String(formData.get("title") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      level: String(formData.get("level") || ""),
      url: String(formData.get("url") || "").trim(),
      status: String(formData.get("status") || "saved"),
      requirements: String(formData.get("requirements") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      history: [...(existing?.history || [])]
    };
    if (job.url && !safeUrl(job.url)) {
      showToast("O link deve começar com http:// ou https://.", true);
      return;
    }
    if (existing) {
      if (existing.status !== job.status) {
        job.history.push({
          at: new Date().toISOString(),
          event: `Status atualizado: ${STATUSES[job.status]}`,
          status: job.status
        });
      }
      data.jobs = data.jobs.map((item) => item.id === id ? job : item);
    }
    else data.jobs.unshift(job);
    if (saveData()) {
      jobDialog.close();
      renderJobs();
      showToast(existing ? "Vaga atualizada." : "Vaga adicionada.");
    }
  });
  statusFilter.addEventListener("change", renderJobs);
  document.querySelector("#export-button").addEventListener("click", () => {
    window.clearTimeout(saveTimer);
    updateResume();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meu-assistente-carreira-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Backup JSON exportado para este dispositivo.");
  });
  document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#import-file").click());
  document.querySelector("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = normalizeData(JSON.parse(await file.text()));
      if (!window.confirm("Importar este arquivo substituirá o currículo, as vagas, as candidaturas e as análises de vagas atuais. Exporte um backup antes, se quiser manter os dados atuais. Continuar?")) return;
      const previousData = data;
      data = imported;
      if (saveData()) {
        fillResumeForm();
        renderJobs();
        renderResumeProfile();
        showToast("Dados importados com sucesso.");
      } else data = previousData;
    } catch (error) {
      console.error("Não foi possível importar o arquivo JSON.", error);
      showToast(`Importação não concluída: ${error.message || "arquivo JSON inválido."}`, true);
    } finally {
      event.target.value = "";
    }
  });
  document.querySelector("#pdf-select-button").addEventListener("click", () => {
    document.querySelector(".pdf-import-details").open = true;
    pdfInput.click();
  });
  pdfInput.addEventListener("change", () => {
    const file = pdfInput.files?.[0];
    if (file) handlePdfFile(file);
    pdfInput.value = "";
  });
  for (const eventName of ["dragenter", "dragover"]) {
    pdfDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (!pdfProcessing) pdfDropzone.classList.add("drag-over");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    pdfDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      pdfDropzone.classList.remove("drag-over");
    });
  }
  pdfDropzone.addEventListener("drop", (event) => {
    if (pdfProcessing) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) handlePdfFile(file);
  });
  document.querySelector("#add-resume-experience").addEventListener("click", () => {
    const entries = readResumeExperienceEditor();
    entries.push({ company: "", role: "", period: "", description: "" });
    renderResumeExperienceEditor(entries);
    resumeExperienceEditor.querySelector(".resume-experience-editor-card:last-child [name='experience-company']")?.focus();
  });
  document.querySelector("#add-resume-tool").addEventListener("click", () => {
    const entries = readResumeToolsEditor();
    entries.push({ name: "", level: "" });
    renderResumeToolsEditor(entries);
    resumeToolsEditor.querySelector(".resume-tool-editor-card:last-child [name='tool-name']")?.focus();
  });
  resumeReviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (currentReviewPage !== 2) {
      setResumeReviewPage(currentReviewPage + 1, true);
      return;
    }
    saveResumeReview();
  });
  document.querySelector("#previous-resume-review-page").addEventListener("click", () => {
    setResumeReviewPage(currentReviewPage - 1, true);
  });
  document.querySelector("#next-resume-review-page").addEventListener("click", () => {
    setResumeReviewPage(currentReviewPage + 1, true);
  });
  const cancelResumeReview = () => {
    const wasImport = reviewMode === "import";
    resumeReviewDialog.close();
    if (wasImport) showToast("Revisão cancelada; o perfil anterior foi mantido.");
  };
  document.querySelector("#cancel-resume-review").addEventListener("click", cancelResumeReview);
  document.querySelector("#close-resume-review").addEventListener("click", cancelResumeReview);
  resumeReviewDialog.addEventListener("click", (event) => {
    if (event.target === resumeReviewDialog) cancelResumeReview();
  });
  document.querySelector("#view-full-resume-button").addEventListener("click", () => {
    renderFullResume();
    document.querySelector("#full-resume-dialog").showModal();
    document.querySelector("#close-full-resume").focus();
  });
  const closeFullResume = () => document.querySelector("#full-resume-dialog").close();
  document.querySelector("#close-full-resume").addEventListener("click", closeFullResume);
  document.querySelector("#close-full-resume-footer").addEventListener("click", closeFullResume);
  document.querySelector("#print-full-resume").addEventListener("click", () => window.print());
  document.querySelector("#full-resume-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeFullResume();
  });
  document.querySelector("#clear-resume-button").addEventListener("click", clearResumeProfile);

  initializeTheme();
  initializeJobDiscovery();
  initializeJobAnalysis();
  initializeDashboardNavigation();
  fillResumeForm();
  renderJobs();
  renderResumeProfile();
  initializeOnboarding();
})();
