(() => {
  "use strict";

  const STORAGE_KEY = "meu-assistente-carreira-v1";
  const STATUSES = {
    saved: "Salva",
    applied: "Candidatado",
    interview: "Entrevista",
    offer: "Proposta",
    rejected: "Encerrada"
  };
  const emptyData = () => ({
    resume: { name: "", email: "", contact: "", location: "", level: "", targetRole: "", summary: "", skills: "", experience: "", education: "" },
    jobs: []
  });
  const resumeForm = document.querySelector("#resume-form");
  const jobForm = document.querySelector("#job-form");
  const jobDialog = document.querySelector("#job-dialog");
  const jobsList = document.querySelector("#jobs-list");
  const emptyState = document.querySelector("#empty-state");
  const statusFilter = document.querySelector("#status-filter");
  const toast = document.querySelector("#toast");
  let toastTimer;
  let saveTimer;
  let data = loadData();

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
    const fields = ["name", "email", "contact", "location", "level", "targetRole", "summary", "skills", "experience", "education"];
    const normalizedResume = {};
    for (const field of fields) normalizedResume[field] = typeof resume[field] === "string" ? resume[field] : "";
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
        createdAt: textValue(job.createdAt) || new Date().toISOString()
      };
    });
    return { resume: normalizedResume, jobs };
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
      if (field) field.value = value;
    }
  }

  function updateResume() {
    const formData = new FormData(resumeForm);
    for (const key of Object.keys(data.resume)) data.resume[key] = String(formData.get(key) || "");
    if (saveData()) {
      document.querySelector("#save-message").textContent = "Currículo salvo neste navegador.";
      renderJobs();
    }
  }

  function normalize(text) {
    return text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function getMatch(job) {
    const resumeText = normalize([data.resume.skills, data.resume.summary, data.resume.experience, data.resume.education].join(" "));
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

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function renderJobs() {
    const filter = statusFilter.value;
    const filteredJobs = data.jobs.filter((job) => filter === "all" || job.status === filter);
    document.querySelector("#stat-total").textContent = String(data.jobs.length);
    document.querySelector("#stat-active").textContent = String(data.jobs.filter((job) => ["applied", "interview", "offer"].includes(job.status)).length);
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
    if (action === "edit") openJobDialog(job);
    if (action === "delete") {
      if (!window.confirm(`Excluir a vaga "${job.title}"?`)) return;
      data.jobs = data.jobs.filter((item) => item.id !== id);
      if (saveData()) renderJobs();
    }
    if (action === "analyze" || action === "tailor") copyPrompt(job, action);
  }

  function makePrompt(job, action) {
    const resume = data.resume;
    const resumeContent = [
      `Nome: ${resume.name || "[não informado]"}`,
      `Cargo desejado: ${resume.targetRole || "[não informado]"}`,
      `Localização: ${resume.location || "[não informada]"}`,
      `Nível: ${resume.level || "[não informado]"}`,
      `Resumo: ${resume.summary || "[não informado]"}`,
      `Competências: ${resume.skills || "[não informadas]"}`,
      `Experiências: ${resume.experience || "[não informadas]"}`,
      `Formação: ${resume.education || "[não informada]"}`
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
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    if (job.url && !safeUrl(job.url)) {
      showToast("O link deve começar com http:// ou https://.", true);
      return;
    }
    if (existing) data.jobs = data.jobs.map((item) => item.id === id ? job : item);
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
      if (!window.confirm("Importar este arquivo substituirá o currículo e as vagas atuais. Exporte um backup antes, se quiser manter os dados atuais. Continuar?")) return;
      data = imported;
      if (saveData()) {
        fillResumeForm();
        renderJobs();
        showToast("Dados importados com sucesso.");
      }
    } catch (error) {
      console.error("Não foi possível importar o arquivo JSON.", error);
      showToast(`Importação não concluída: ${error.message || "arquivo JSON inválido."}`, true);
    } finally {
      event.target.value = "";
    }
  });

  fillResumeForm();
  renderJobs();
})();
