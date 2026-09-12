import type {
  Collaborator,
  CollaboratorRole,
  FormDoc,
  Profile,
  ResponseDoc,
  UploadedFile,
} from "../types";

/**
 * Contrato unico de acceso a datos. `mock` lo implementa contra localStorage y
 * `supabase` contra la base real. La app solo conoce esta interfaz.
 */
export interface DataSource {
  readonly name: "mock" | "supabase";

  /* Autenticacion */
  signIn(email: string, password: string): Promise<Profile>;
  signUp(email: string, password: string, name: string): Promise<Profile>;
  signOut(): Promise<void>;
  getSession(): Promise<Profile | null>;

  /* Formularios */
  listForms(ownerId: string): Promise<FormDoc[]>;
  getForm(id: string): Promise<FormDoc | null>;
  saveForm(form: FormDoc): Promise<FormDoc>;
  deleteForm(id: string): Promise<void>;

  /* Respuestas */
  listResponses(formId: string): Promise<ResponseDoc[]>;
  createResponse(response: ResponseDoc): Promise<ResponseDoc>;
  deleteResponses(formId: string): Promise<void>;

  /* Colaboradores */
  listCollaborators(formId: string): Promise<Collaborator[]>;
  addCollaborator(formId: string, email: string, role: CollaboratorRole): Promise<Collaborator>;
  removeCollaborator(formId: string, email: string): Promise<void>;

  /* Archivos y firmas */
  uploadFile(file: File, folder: string): Promise<UploadedFile>;
}

export class DataError extends Error {}
