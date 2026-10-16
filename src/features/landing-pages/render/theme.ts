import type { CSSProperties } from "react";

import type { BlockStyle, LandingTheme } from "../types";

const SHADOWS: Record<LandingTheme["shadow"], string> = {
  none: "none",
  soft: "0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.06)",
  medium: "0 2px 4px rgba(0,0,0,.08), 0 10px 24px rgba(0,0,0,.10)",
  strong: "0 4px 8px rgba(0,0,0,.10), 0 18px 40px rgba(0,0,0,.16)",
};

/**
 * Tema como variáveis CSS num único elemento raiz.
 *
 * Tudo o que o renderer desenha lê destas variáveis, então mudar uma cor no
 * editor repinta a pré-visualização inteira sem recriar componente nenhum —
 * é o que permite o preview em tempo real ser barato.
 */
export function themeToCssVars(theme: LandingTheme): CSSProperties {
  const fontStack = (font: string) =>
    `${font}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  return {
    "--lp-primary": theme.primaryColor,
    "--lp-secondary": theme.secondaryColor,
    "--lp-bg": theme.backgroundColor,
    "--lp-text": theme.textColor,
    "--lp-button": theme.buttonColor,
    "--lp-button-text": theme.buttonTextColor,
    "--lp-header-bg": theme.headerBackground,
    "--lp-header-text": theme.headerTextColor,
    "--lp-footer-bg": theme.footerBackground,
    "--lp-footer-text": theme.footerTextColor,
    "--lp-variant-selected": theme.variantSelectedColor,
    "--lp-heading-font": fontStack(theme.headingFont),
    "--lp-body-font": fontStack(theme.bodyFont),
    "--lp-radius": `${theme.radius}px`,
    "--lp-shadow": SHADOWS[theme.shadow] ?? SHADOWS.soft,
    "--lp-max-width": `${theme.maxWidth}px`,
    "--lp-muted": theme.colorScheme === "dark" ? "#A1A1AA" : "#71717A",
    "--lp-border":
      theme.colorScheme === "dark"
        ? "rgba(255,255,255,.14)"
        : "rgba(0,0,0,.10)",
    "--lp-surface":
      theme.colorScheme === "dark" ? "rgba(255,255,255,.05)" : "#FAFAFA",
    backgroundColor: "var(--lp-bg)",
    color: "var(--lp-text)",
    fontFamily: "var(--lp-body-font)",
  } as CSSProperties;
}

/** Estilo do botão principal conforme a preferência do tema. */
export function buttonStyle(theme: LandingTheme): CSSProperties {
  const base: CSSProperties = {
    borderRadius: "var(--lp-radius)",
    fontWeight: 700,
    transition: "filter .15s ease, background-color .15s ease",
  };

  if (theme.buttonStyle === "outline") {
    return {
      ...base,
      backgroundColor: "transparent",
      color: "var(--lp-button)",
      border: "2px solid var(--lp-button)",
    };
  }
  if (theme.buttonStyle === "soft") {
    return {
      ...base,
      backgroundColor: "color-mix(in srgb, var(--lp-button) 16%, transparent)",
      color: "var(--lp-button)",
      border: "1px solid transparent",
    };
  }
  return {
    ...base,
    backgroundColor: "var(--lp-button)",
    color: "var(--lp-button-text)",
    border: "1px solid transparent",
  };
}

/** Converte o estilo por bloco em CSS embutido. */
export function blockStyleToCss(style: BlockStyle | undefined): CSSProperties {
  if (!style) return {};
  return {
    ...(style.background ? { backgroundColor: style.background } : {}),
    ...(style.textColor ? { color: style.textColor } : {}),
    ...(typeof style.paddingTop === "number"
      ? { paddingTop: `${style.paddingTop}px` }
      : {}),
    ...(typeof style.paddingBottom === "number"
      ? { paddingBottom: `${style.paddingBottom}px` }
      : {}),
    ...(style.align ? { textAlign: style.align } : {}),
  };
}

/**
 * Classe de visibilidade por dispositivo. Usa utilitários do Tailwind já
 * presentes no projeto — nada de media query gerada em tempo de execução.
 */
export function visibilityClass(style: BlockStyle | undefined): string {
  if (style?.visibility === "desktop") return "hidden md:block";
  if (style?.visibility === "mobile") return "block md:hidden";
  return "";
}

export function animationClass(style: BlockStyle | undefined): string {
  if (style?.animation === "fade") return "lp-anim-fade";
  if (style?.animation === "rise") return "lp-anim-rise";
  return "";
}

/**
 * CSS global da página pública. Fica aqui, e não no `globals.css`, porque
 * só se aplica dentro de uma landing renderizada — o painel não carrega isto.
 */
export const LANDING_BASE_CSS = `
.lp-root h1, .lp-root h2, .lp-root h3 { font-family: var(--lp-heading-font); letter-spacing: -0.02em; }
.lp-root a { color: inherit; }
.lp-root :focus-visible { outline: 3px solid var(--lp-primary); outline-offset: 2px; }
.lp-product-offer { padding-top: 28px !important; padding-bottom: 48px !important; }
.lp-product-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: start; }
.lp-product-offer section { padding: 0 !important; }
.lp-product-gallery > section > div > div:first-child { padding: 14px; border-radius: 24px !important; border-color: #f0f1f3 !important; }
.lp-product-gallery img { display: block; }
.lp-product-gallery > section > div > div:first-child > img { aspect-ratio: 1; }
.lp-product-gallery button { cursor: pointer; }
.lp-product-gallery > section > div > div:last-child:not(:first-child) { gap: 10px; }
.lp-product-gallery > section > div > div:last-child:not(:first-child) button { border-radius: 10px !important; padding: 4px; }
.lp-product-gallery > section > div > div:last-child:not(:first-child) img { width: 56px; height: 56px; }
.lp-gallery-discount { position: absolute; top: 10px; left: 10px; border-radius: 999px; background: #ed2028; padding: 4px 14px; color: #fff; font-size: 14px; font-weight: 800; pointer-events: none; }
.lp-product-brand { color: var(--lp-primary); font-size: 14px; font-weight: 800; margin: 3px 0 10px; }
.lp-product-title { max-width: 500px; font-size: 34px; line-height: 1.4; font-weight: 800; margin: 0; }
.lp-product-rating { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 9px; font-size: 14px; color: #7b8795; }
.lp-product-available { color: #16b96d; font-weight: 600; }
.lp-product-price { margin-top: 23px; }
.lp-product-options { margin-top: 18px; }
.lp-product-options [role=radiogroup] { margin-top: 8px; gap: 8px; }
.lp-product-options [role=radio] { border-radius: 12px !important; padding: 8px 10px; text-align: left; min-width: 174px; }
.lp-product-options [role=radio] img { border-radius: 6px !important; }
.lp-product-options [role=radio] > span > span:last-child { opacity: 1; color: var(--lp-primary); font-weight: 700; }
.lp-product-options [role=radio] del, .lp-product-options [role=radio] .line-through { color: #9ca3af; font-weight: 400; }
.lp-product-payment { margin: 36px 0 34px 16px; }
.lp-product-purchase { display: flex; align-items: center; gap: 12px; }
.lp-product-quantity > section > div > p { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.lp-product-quantity > section > div > div { border-radius: 999px !important; margin: 0; }
.lp-product-quantity button { width: 42px; height: 50px; }
.lp-product-quantity span { width: 44px; }
.lp-product-buy { flex: 1; min-width: 0; }
.lp-product-buy a { min-height: 50px; border-radius: 999px !important; box-shadow: 0 6px 15px color-mix(in srgb, var(--lp-button) 18%, transparent); }
.lp-product-promises { display: grid; gap: 12px; margin: 22px 0 0; padding: 0; list-style: none; color: #7b8795; font-size: 14px; }
.lp-product-promises li { display: flex; align-items: center; gap: 10px; }
@media (max-width: 767px) {
 .lp-product-offer { padding-top: 16px !important; padding-bottom: 32px !important; }
 .lp-product-grid { grid-template-columns: minmax(0, 1fr); gap: 26px; }
 .lp-product-title { font-size: 27px; line-height: 1.25; }
 .lp-product-payment { margin: 24px 0; }
 .lp-product-options [role=radio] { min-width: 0; flex: 1; }
 .lp-product-quantity button { width: 32px; height: 48px; }
 .lp-product-quantity span { width: 32px; }
 .lp-product-promises { font-size: 12px; }
}
.lp-anim-fade { animation: lp-fade .5s ease both; }
.lp-anim-rise { animation: lp-rise .5s ease both; }
@keyframes lp-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes lp-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) {
  .lp-anim-fade, .lp-anim-rise { animation: none; }
}
`.trim();
