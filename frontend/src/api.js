// api.js
// ──────
// Every call your frontend makes to the backend lives here.
// If you deploy and your URL changes, you only edit ONE line: BASE_URL.

import axios from "axios";

const BASE_URL = "http://localhost:8000";

// ── Upload a PDF file ─────────────────────────────────
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ── Check if document is loaded ───────────────────────
export const getStatus = async () => {
  const res = await axios.get(`${BASE_URL}/status`);
  return res.data;
};

// ── Mode 1: Ask a question ────────────────────────────
export const askQuestion = async (query) => {
  const res = await axios.post(`${BASE_URL}/ask`, { query });
  return res.data;
};

// ── Mode 2: Generate exam questions ───────────────────
export const getExamQuestions = async (topic) => {
  const res = await axios.post(`${BASE_URL}/exam-questions`, { query: topic });
  return res.data;
};

// ── Mode 3: Get revision summary ─────────────────────
export const getSummary = async (topic) => {
  const res = await axios.post(`${BASE_URL}/summary`, { query: topic });
  return res.data;
};

// ── Mode 4: Get one viva question ────────────────────
export const getVivaQuestion = async (topic, previousQuestions = []) => {
  const res = await axios.post(`${BASE_URL}/viva/question`, {
    query: topic,
    previous_questions: previousQuestions,
  });
  return res.data;
};

// ── Mode 4: Evaluate viva answer ─────────────────────
export const evaluateVivaAnswer = async (question, answer) => {
  const res = await axios.post(`${BASE_URL}/viva/evaluate`, { question, answer });
  return res.data;
};