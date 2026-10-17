"use client";

import { sanitizeHtml, sanitizeCss } from "../sanitize";
import {
  OZAMA_DESCRIPTION_CSS,
  OZAMA_DESCRIPTION_HTML,
} from "./ozama-description-content";

const html = sanitizeHtml(OZAMA_DESCRIPTION_HTML);
const css = sanitizeCss(OZAMA_DESCRIPTION_CSS);

export default function OzamaDescription() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className="lp-ozama-description"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
