import { describe, expect, it } from "vitest";
import { assemble, formToRow, questionToRow, rowToQuestion, sectionToRow } from "./supabase";
import { makeBlankForm, makeOption, makeQuestion, makeSection } from "../defaults";
import { SUBMIT_FORM, type FormDoc } from "../types";

/** Formulario con dos secciones, varios tipos y lógica condicional. */
function richForm(): FormDoc {
  const form = makeBlankForm("user_test");
  form.title = "Inscripcion";
  form.settings.isQuiz = true;

  const uno = makeSection("Datos");
  const nombre = makeQuestion("short_text", true);
  nombre.title = "Nombre";
  nombre.validation = { kind: "length", rule: "max", value: "80" };

  const eleccion = makeQuestion("multiple_choice", true);
  const si = makeOption("Si");
  const no = makeOption("No");
  eleccion.options = [si, no];
  eleccion.points = 3;
  eleccion.answerKey = ["Si"];
  eleccion.feedback = { correct: "Bien" };

  const dos = makeSection("Firma");
  const firma = makeQuestion("signature", true);

  eleccion.goToSection = { [si.id]: dos.id, [no.id]: SUBMIT_FORM };
  uno.questions = [nombre, eleccion];
  dos.questions = [firma];
  form.sections = [uno, dos];
  return form;
}

/** Simula el viaje completo: modelo -> filas -> Postgres -> modelo. */
function roundTrip(form: FormDoc): FormDoc {
  const formRow = formToRow(form);
  const sectionRows = form.sections.map((section, index) => sectionToRow(section, form.id, index));
  const questionRows = form.sections.flatMap((section) =>
    section.questions.map((question, index) => questionToRow(question, form.id, section.id, index)),
  );
  // Postgres no garantiza el orden: lo desordenamos a propósito.
  return assemble([formRow], [...sectionRows].reverse(), [...questionRows].reverse())[0];
}

describe("mapeo a las tablas normalizadas", () => {
  it("conserva el orden de secciones y preguntas aunque lleguen desordenadas", () => {
    const original = richForm();
    const result = roundTrip(original);

    expect(result.sections.map((s) => s.title)).toEqual(["Datos", "Firma"]);
    expect(result.sections[0].questions.map((q) => q.title)).toEqual(["Nombre", "Pregunta sin titulo"]);
  });

  it("guarda la posicion de cada pregunta dentro de su seccion", () => {
    const form = richForm();
    const rows = form.sections.flatMap((section) =>
      section.questions.map((q, index) => questionToRow(q, form.id, section.id, index)),
    );
    expect(rows.map((r) => r.position)).toEqual([0, 1, 0]);
    expect(rows.every((r) => r.form_id === form.id)).toBe(true);
  });

  it("mueve la configuracion del tipo a la columna config y la devuelve intacta", () => {
    const form = richForm();
    const eleccion = form.sections[0].questions[1];
    const row = questionToRow(eleccion, form.id, form.sections[0].id, 1);

    expect(row.config.options).toHaveLength(2);
    expect(row.config.scale).toBeUndefined();
    expect(rowToQuestion(row).options).toEqual(eleccion.options);
  });

  it("conserva la configuracion de la firma", () => {
    const form = richForm();
    const firma = form.sections[1].questions[0];
    const restored = rowToQuestion(questionToRow(firma, form.id, form.sections[1].id, 0));
    expect(restored.signature).toEqual(firma.signature);
    expect(restored.type).toBe("signature");
  });

  it("conserva puntos, clave de respuesta y comentarios del cuestionario", () => {
    const form = richForm();
    const restored = roundTrip(form).sections[0].questions[1];
    expect(restored.points).toBe(3);
    expect(restored.answerKey).toEqual(["Si"]);
    expect(restored.feedback).toEqual({ correct: "Bien" });
  });

  it("conserva la logica condicional entre secciones", () => {
    const form = richForm();
    const original = form.sections[0].questions[1].goToSection!;
    const restored = roundTrip(form).sections[0].questions[1].goToSection;
    expect(restored).toEqual(original);
  });

  it("conserva la validacion de respuesta", () => {
    const form = richForm();
    const restored = roundTrip(form).sections[0].questions[0];
    expect(restored.validation).toEqual({ kind: "length", rule: "max", value: "80" });
  });

  it("no pierde el tema, los ajustes ni el id de la hoja de calculo", () => {
    const form = richForm();
    form.spreadsheetId = "sheet_123";
    const restored = roundTrip(form);
    expect(restored.theme).toEqual(form.theme);
    expect(restored.settings.isQuiz).toBe(true);
    expect(restored.spreadsheetId).toBe("sheet_123");
  });

  it("reparte las preguntas entre varios formularios sin mezclarlas", () => {
    const a = richForm();
    const b = richForm();
    b.id = "form_b";
    b.sections = [makeSection("Solo una")];

    const rows = [a, b].map(formToRow);
    const sections = [a, b].flatMap((f) => f.sections.map((s, i) => sectionToRow(s, f.id, i)));
    const questions = [a, b].flatMap((f) =>
      f.sections.flatMap((s) => s.questions.map((q, i) => questionToRow(q, f.id, s.id, i))),
    );

    const [restoredA, restoredB] = assemble(rows, sections, questions);
    expect(restoredA.sections).toHaveLength(2);
    expect(restoredB.sections).toHaveLength(1);
    expect(restoredB.sections[0].questions).toHaveLength(0);
  });
});
