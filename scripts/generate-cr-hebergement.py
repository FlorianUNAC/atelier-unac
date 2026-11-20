"""Generate the Air France committee AcroForms with ReportLab.

Run with Node.js on PATH and the SFR and Novotype fonts in ~/Library/Fonts.
Set UNAC_PDF_FONT_DIR to use a different directory.
"""
import json
import os
from pathlib import Path
import subprocess

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = A4
MARGIN = 36
BODY = WIDTH - 2 * MARGIN
PINK = HexColor("#B33868")
INK = HexColor("#2B1225")
MUTED = HexColor("#7D5A6E")
PAPER = HexColor("#F2EEF0")
OUTLINE = HexColor("#E3D6DD")
BORDER = HexColor("#C9B8C1")


def draw_text(pdf, x, y, value, size=10, bold=False, color=INK, font=None):
    pdf.setFillColor(color)
    pdf.setFont(font or ("SFR-Bold" if bold else "SFR-Regular"), size)
    pdf.drawString(x, y, value)


def field(pdf, name, label, x, y, width, height, multiline=False, limit=500, value="", readonly=False):
    pdf.acroForm.textfield(
        name=name, tooltip=label, x=x, y=y, width=width, height=height,
        fontName="Helvetica", fontSize=10, textColor=INK, fillColor=white,
        borderColor=BORDER, borderWidth=0.7, forceBorder=True,
        fieldFlags="multiline" if multiline else ("readOnly" if readonly else ""),
        value=value, maxlen=limit,
    )


def card(pdf, bottom, top):
    pdf.setFillColor(white)
    pdf.setStrokeColor(OUTLINE)
    pdf.setLineWidth(1)
    pdf.roundRect(24, bottom, WIDTH - 48, top - bottom, 10, fill=1, stroke=1)


def header(pdf, network, section):
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(PINK)
    pdf.rect(0, HEIGHT - 118, WIDTH, 118, fill=1, stroke=0)
    pdf.drawImage(str(ROOT / "commun/img/logo-unac-blanc.png"), WIDTH - 95, 742,
                  width=60, height=64, preserveAspectRatio=True, mask="auto")
    draw_text(pdf, MARGIN, 790, "COMPTE RENDU", 19, color=white, font="Novotype-Regular")
    draw_text(pdf, MARGIN, 765, "HÉBERGEMENT", 24, color=white, font="Novotype-Medium")
    draw_text(pdf, MARGIN, 745, f"Air France · {network} · {section}", 9, color=white)
    draw_text(pdf, MARGIN, 731, "Enregistrez le PDF rempli, puis importez-le dans l’outil CR hébergement de l’Atelier UNAC.", 8, color=white)


def footer(pdf, page, total):
    draw_text(pdf, 24, 28, "UNAC · Commission hébergement", 8, color=MUTED)
    pdf.drawRightString(WIDTH - 24, 28, f"{page} / {total}")
    pdf.showPage()


def draw_escale(pdf, y, code, city, zone, extra=None):
    card(pdf, y - 73, y + (15 if extra is not None else 13))
    if extra is None:
        key = code
        label = f"{code}  ·  {city}"
        width = pdf.stringWidth(label, "SFR-Bold", 9) + 14
        pdf.setFillColor(PINK)
        pdf.roundRect(MARGIN, y - 3, width, 13, 5, fill=1, stroke=0)
        draw_text(pdf, MARGIN + 7, y, label, 9, True, white)
        draw_text(pdf, MARGIN + max(160, width + 10), y, zone, 8, color=MUTED)
        note_name = f"crheb_escale_{code}"
    else:
        key = f"extra_{extra}"
        draw_text(pdf, MARGIN, y, "Code IATA", 9, True)
        field(pdf, f"crheb_extra_code_{extra}", f"Autre escale {extra} - code IATA",
              MARGIN + 56, y - 4, 43, 16, limit=3)
        draw_text(pdf, MARGIN + 110, y, "Ville", 9, True)
        field(pdf, f"crheb_ville_{key}", f"Autre escale {extra} - ville",
              MARGIN + 135, y - 4, 168, 16, limit=65)
        note_name = f"crheb_extra_note_{extra}"
    pdf.acroForm.checkbox(
        name=f"crheb_maj_{key}", tooltip=f"{city} - Mettre à jour l'hôtel ou le contrat",
        x=WIDTH - MARGIN - 182, y=y - 2, size=11, buttonStyle="check",
        borderColor=BORDER, fillColor=white, textColor=PINK, borderWidth=0.8,
    )
    draw_text(pdf, WIDTH - MARGIN - 165, y, "Mettre à jour l’hôtel ou le contrat", 9, color=PINK)

    for name, label, x, width, limit in (
        ("hotel", "Nom de l’hôtel", MARGIN, BODY - 218, 120),
        ("etoiles", "Étoiles (1 à 5)", WIDTH - MARGIN - 208, 77, 1),
        ("echeance", "Fin de contrat (JJ/MM/AAAA)", WIDTH - MARGIN - 121, 121, 10),
    ):
        draw_text(pdf, x, y - 17, label.upper(), 7.2, True, MUTED)
        field(pdf, f"crheb_{name}_{key}", f"{city} - {label}", x, y - 35, width, 15, limit=limit)
    draw_text(pdf, MARGIN, y - 44, "COMMENTAIRE", 7.2, True, MUTED)
    field(pdf, note_name, f"{city} - Commentaire", MARGIN, y - 68, BODY, 21, True, 500)


def generate(network, zones):
    full_name = {"LC": "Long-courrier", "MC": "Moyen-courrier"}[network]
    rows = [(code, city, group["zone"]) for group in zones
            for code, city in sorted(group["escales"].items(), key=lambda item: item[1].casefold())]
    rows = list({code: (code, city, zone) for code, city, zone in rows}.values())
    first_page_rows = 4
    rows_per_page = 7
    pages = [rows[:first_page_rows]]
    pages.extend(rows[i:i + rows_per_page] for i in range(first_page_rows, len(rows), rows_per_page))
    pages.append([(None, f"Autre escale {i}", "") for i in range(1, 8)])
    total = len(pages)

    pdf = Canvas(str(ROOT / f"formulaires/cr-hebergement-{network.lower()}.pdf"), pagesize=A4)
    pdf.setTitle(f"Compte rendu d’hébergement - {full_name}")
    pdf.setAuthor("UNAC Air France")

    for page, entries in enumerate(pages, 1):
        extra = page == total
        if page == 1:
            header(pdf, full_name, "Commission hébergement")
            card(pdf, 491, 702)
            draw_text(pdf, MARGIN, 686, "LE COMPTE RENDU", 10, True, PINK)
            draw_text(pdf, MARGIN, 675, "MOIS DU CR (AAAA-MM)", 8, True, MUTED)
            draw_text(pdf, 277, 675, "RÉSEAU", 8, True, MUTED)
            field(pdf, "crheb_mois", "Mois du CR (AAAA-MM)", MARGIN, 649, 210, 19, limit=7)
            field(pdf, "crheb_v1", "Réseau du compte rendu", 277, 649, 150, 19, value=network, readonly=True)
            pdf.setFillColor(PINK)
            pdf.roundRect(MARGIN, 621, 57, 17, 5, fill=1, stroke=0)
            draw_text(pdf, MARGIN + 9, 626, "À noter", 10, True, white)
            field(pdf, "crheb_a_noter", "À noter", MARGIN, 503, BODY, 111, True, 1800)
            draw_text(pdf, MARGIN, 476, "Escales", 14, True, PINK)
            draw_text(pdf, MARGIN, 458, "Ajoutez un commentaire ou cochez la case pour mettre à jour les champs hôtel renseignés.", 9)
            draw_text(pdf, MARGIN, 443, "Laissez vides les escales sans sujet. Saisissez « RAS » si l’escale a été abordée sans remarque.", 9)
            first_y = 399
        else:
            header(pdf, full_name, "Autres escales" if extra else "Escales")
            hint = ("Saisissez le code IATA, la ville et les informations à importer." if extra
                    else "Renseignez les escales à importer. Un champ hôtel laissé vide conserve sa valeur dans le CR.")
            draw_text(pdf, MARGIN, 704, hint, 9)
            first_y = 668
        for index, (code, city, zone) in enumerate(entries, 1):
            draw_escale(pdf, first_y - (index - 1) * 91, code, city, zone, index if extra else None)
        footer(pdf, page, total)
    pdf.save()


if __name__ == "__main__":
    reference = subprocess.check_output(
        ["node", "-e", "global.window = {}; require(process.argv[1]); console.log(JSON.stringify(window.ESCALES));",
         str(ROOT / "commun/escales.js")],
        text=True,
    )
    font_dir = Path(os.environ.get("UNAC_PDF_FONT_DIR", Path.home() / "Library/Fonts"))
    for family, filename in (
        ("SFR-Regular", "UNAC Regular.ttf"),
        ("SFR-Bold", "UNAC-bold.ttf"),
        ("Novotype-Regular", "Novotype_Regular.ttf"),
        ("Novotype-Medium", "Novotype_Medium.ttf"),
    ):
        pdfmetrics.registerFont(TTFont(family, str(font_dir / filename)))
    for network, zones in json.loads(reference).items():
        if network in ("LC", "MC"):
            generate(network, zones)
