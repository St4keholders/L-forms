import { describe, expect, it } from "vitest";
import { makeBlankForm, makeOption, makeQuestion, makeSection } from "./defaults";
import { gradeResponse, isCorrect, resolveNextSection, validateAnswer, validateSection } from "./logic";
import { SUBMIT_FORM, type FormDoc, type SignatureValue } from "./types";

function formWithSections(): FormDoc {
  const form = makeBlankForm("user_test");
  form.sections = [makeSection("Uno"), makeSection("Dos"), makeSection("Tres")];
  return form;
}

describe("validateAnswer", () => {
  it("exige respuesta cuando la pregunta es obligatoria", () => {
    const question = makeQuestion("short_text", true);
    expect(validateAnswer(question, "")).toBe("Esta pregunta es obligatoria.");
    expect(validateAnswer(question, "hola")).toBeNull();
  });

  it("deja pasar las opcionales vacias", () => {
    expect(validateAnswer(makeQuestion("paragraph", false), "")).toBeNull();
  });

  it("aplica la validacion numerica", () => {
    const question = makeQuestion("short_text");
    question.validation = { kind: "number", rule: "gte", value: "18" };
    expect(validateAnswer(question, "17")).not.toBeNull();
    expect(validateAnswer(question, "18")).toBeNull();
  });

  it("aplica limites de longitud con mensaje propio", () => {
    const question = makeQuestion("paragraph");
    question.validation = { kind: "length", rule: "max", value: "5", message: "Muy largo" };
    expect(validateAnswer(question, "123456")).toBe("Muy largo");
  });

  it("no rompe si la expresion regular es invalida", () => {
    const question = makeQuestion("short_text");
    question.validation = { kind: "regex", rule: "matches", value: "([" };
    expect(validateAnswer(question, "lo que sea")).toBeNull();
  });

  it("pide nombre y consentimiento en la firma", () => {
    const question = makeQuestion("signature", true);
    const firma: SignatureValue = {
      imageUrl: "data:image/png;base64,xxx",
      typedName: "",
      consent: false,
      signedAt: new Date().toISOString(),
      hash: "abc",
      userAgent: "test",
      method: "drawn",
    };
    expect(validateAnswer(question, firma)).toContain("nombre completo");
    expect(validateAnswer(question, { ...firma, typedName: "Ana" })).toContain("declaracion");
    expect(validateAnswer(question, { ...firma, typedName: "Ana", consent: true })).toBeNull();
  });

  it("rechaza firmas vacias en preguntas obligatorias", () => {
    const question = makeQuestion("signature", true);
    expect(validateAnswer(question, null)).toContain("firma");
  });
});

describe("validateSection", () => {
  it("devuelve un error por cada pregunta obligatoria sin responder", () => {
    const form = makeBlankForm("user_test");
    const section = form.sections[0];
    section.questions = [makeQuestion("short_text", true), makeQuestion("paragraph", true)];
    const errors = validateSection(form, section.id, {});
    expect(Object.keys(errors)).toHaveLength(2);
  });
});

describe("resolveNextSection", () => {
  it("avanza a la siguiente seccion por defecto", () => {
    const form = formWithSections();
    expect(resolveNextSection(form, form.sections[0].id, {})).toBe(form.sections[1].id);
  });

  it("envia el formulario al terminar la ultima seccion", () => {
    const form = formWithSections();
    expect(resolveNextSection(form, form.sections[2].id, {})).toBe(SUBMIT_FORM);
  });

  it("respeta la ruta fija de la seccion", () => {
    const form = formWithSections();
    form.sections[0].nextSection = form.sections[2].id;
    expect(resolveNextSection(form, form.sections[0].id, {})).toBe(form.sections[2].id);
  });

  it("da prioridad a la ruta de la opcion elegida", () => {
    const form = formWithSections();
    const question = makeQuestion("multiple_choice");
    const si = makeOption("Si");
    const no = makeOption("No");
    question.options = [si, no];
    question.goToSection = { [si.id]: form.sections[2].id, [no.id]: SUBMIT_FORM };
    form.sections[0].questions = [question];
    form.sections[0].nextSection = form.sections[1].id;

    expect(resolveNextSection(form, form.sections[0].id, { [question.id]: "Si" })).toBe(
      form.sections[2].id,
    );
    expect(resolveNextSection(form, form.sections[0].id, { [question.id]: "No" })).toBe(SUBMIT_FORM);
  });

  it("ignora rutas hacia secciones eliminadas", () => {
    const form = formWithSections();
    form.sections[0].nextSection = "sec_inexistente";
    expect(resolveNextSection(form, form.sections[0].id, {})).toBe(form.sections[1].id);
  });
});

describe("calificacion", () => {
  it("compara sin distinguir mayusculas ni espacios", () => {
    const question = makeQuestion("short_text");
    question.answerKey = ["Bogota"];
    expect(isCorrect(question, " bogota ")).toBe(true);
  });

  it("exige coincidencia exacta del conjunto en casillas", () => {
    const question = makeQuestion("checkboxes");
    question.answerKey = ["A", "B"];
    expect(isCorrect(question, ["A"])).toBe(false);
    expect(isCorrect(question, ["B", "A"])).toBe(true);
  });

  it("suma solo las preguntas con puntos", () => {
    const form = makeBlankForm("user_test");
    const buena = makeQuestion("short_text");
    buena.points = 5;
    buena.answerKey = ["si"];
    const sinPuntos = makeQuestion("short_text");
    sinPuntos.answerKey = ["si"];
    form.sections[0].questions = [buena, sinPuntos];

    const result = gradeResponse(form, { [buena.id]: "si", [sinPuntos.id]: "si" });
    expect(result).toEqual({ score: 5, totalPoints: 5 });
  });
});
