import { uid } from "../id";
import { seedForms, seedResponses } from "./seed";
import { DataError, type DataSource } from "./types";
import type {
  Collaborator,
  CollaboratorRole,
  FormDoc,
  Profile,
  ResponseDoc,
  UploadedFile,
} from "../types";

const STORAGE_KEY = "l-forms:db";
const SESSION_KEY = "l-forms:session";

interface Db {
  users: (Profile & { password: string })[];
  forms: FormDoc[];
  responses: ResponseDoc[];
  collaborators: Collaborator[];
}

const DEMO_USER: Profile & { password: string } = {
  id: "user_demo",
  email: "demo@l-forms.app",
  name: "Equipo demo",
  password: "demo1234",
};

function freshDb(): Db {
  return {
    users: [DEMO_USER],
    forms: seedForms(DEMO_USER.id),
    responses: [],
    collaborators: [],
  };
}

function hydrate(db: Db): Db {
  if (db.responses.length === 0 && db.forms.length > 0) {
    db.responses = db.forms.flatMap((f) => seedResponses(f));
  }
  return db;
}

function read(): Db {
  const db = readRaw();
  // Compatibilidad con datos guardados antes de existir los colaboradores.
  if (!db.collaborators) db.collaborators = [];
  return db;
}

function readRaw(): Db {
  if (typeof window === "undefined") return hydrate(freshDb());
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = hydrate(freshDb());
      write(db);
      return db;
    }
    return JSON.parse(raw) as Db;
  } catch {
    return hydrate(freshDb());
  }
}

function write(db: Db) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Simula la latencia de red para que los estados de carga sean visibles. */
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const mockSource: DataSource = {
  name: "mock",

  async signIn(email, password) {
    await wait();
    const db = read();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password)
      throw new DataError("Correo o contrasena incorrectos.");
    const profile: Profile = { id: user.id, email: user.email, name: user.name };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    return profile;
  },

  async signUp(email, password, name) {
    await wait();
    const db = read();
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new DataError("Ya existe una cuenta con ese correo.");
    if (password.length < 8) throw new DataError("La contrasena debe tener al menos 8 caracteres.");
    const user = { id: uid("user"), email: email.trim(), name: name.trim() || "Sin nombre", password };
    db.users.push(user);
    write(db);
    const profile: Profile = { id: user.id, email: user.email, name: user.name };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    return profile;
  },

  async signOut() {
    window.localStorage.removeItem(SESSION_KEY);
  },

  async getSession() {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  },

  async listForms(ownerId) {
    await wait(80);
    return read()
      .forms.filter((f) => f.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getForm(id) {
    await wait(80);
    return read().forms.find((f) => f.id === id) ?? null;
  },

  async saveForm(form) {
    const db = read();
    const next = { ...form, updatedAt: new Date().toISOString() };
    const index = db.forms.findIndex((f) => f.id === form.id);
    if (index === -1) db.forms.push(next);
    else db.forms[index] = next;
    write(db);
    return next;
  },

  async deleteForm(id) {
    const db = read();
    db.forms = db.forms.filter((f) => f.id !== id);
    db.responses = db.responses.filter((r) => r.formId !== id);
    db.collaborators = db.collaborators.filter((c) => c.formId !== id);
    write(db);
  },

  async listResponses(formId) {
    await wait(80);
    return read()
      .responses.filter((r) => r.formId === formId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  async createResponse(response) {
    const db = read();
    db.responses.push(response);
    write(db);
    return response;
  },

  async deleteResponses(formId) {
    const db = read();
    db.responses = db.responses.filter((r) => r.formId !== formId);
    write(db);
  },

  async listCollaborators(formId) {
    await wait(60);
    return read().collaborators.filter((c) => c.formId === formId);
  },

  async addCollaborator(formId, email, role) {
    const db = read();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
      throw new DataError("Escribe un correo valido.");
    if (db.collaborators.some((c) => c.formId === formId && c.email === clean))
      throw new DataError("Esa persona ya esta invitada.");
    const collaborator: Collaborator = {
      formId,
      email: clean,
      role: role as CollaboratorRole,
      invitedAt: new Date().toISOString(),
    };
    db.collaborators.push(collaborator);
    write(db);
    return collaborator;
  },

  async removeCollaborator(formId, email) {
    const db = read();
    db.collaborators = db.collaborators.filter(
      (c) => !(c.formId === formId && c.email === email.trim().toLowerCase()),
    );
    write(db);
  },

  async uploadFile(file) {
    // En modo mock los archivos se guardan como data URL dentro del navegador.
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new DataError("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
    return { name: file.name, url, size: file.size } satisfies UploadedFile;
  },
};

export const DEMO_CREDENTIALS = { email: DEMO_USER.email, password: DEMO_USER.password };
