"""Generate the newsletter contribution AcroForm with ReportLab.

Contributors (for example the retirement expert) fill the PDF in Acrobat Reader,
Preview or a browser, save it and send it back; the PDF is then dropped into the
Newsletter tool, which reads the nl_* fields.

Run with the SFR and Novotype fonts in ~/Library/Fonts (or UNAC_PDF_FONT_DIR).
"""
import os
from pathlib import Path

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
PALE = HexColor("#FBE4EC")
OUTLINE = HexColor("#E3D6DD")
BORDER = HexColor("#C9B8C1")
SECTIONS = 8
TOTAL = 3


def text(pdf, x, y, value, size=10, bold=False, color=INK, font=None):
    pdf.setFillColor(color)
    pdf.setFont(font or ("SFR-Bold" if bold else "SFR-Regular"), size)
    pdf.drawString(x, y, value)


def label(pdf, x, y, value):
    text(pdf, x, y, value.upper(), 7.2, True, MUTED)


def field(pdf, name, tip, x, y, width, height, multiline=False, limit=0, value="", readonly=False):
    flags = "multiline" if multiline else ("readOnly" if readonly else "")
    pdf.acroForm.textfield(
        name=name, tooltip=tip, x=x, y=y, width=width, height=height,
        fontName="Helvetica", fontSize=10 if not multiline else 9.5, textColor=INK, fillColor=white,
        borderColor=BORDER, borderWidth=0.7, forceBorder=True,
        fieldFlags=flags, value=value, maxlen=limit or 4000,
    )


def card(pdf, bottom, top):
    pdf.setFillColor(white)
    pdf.setStrokeColor(OUTLINE)
    pdf.setLineWidth(1)
    pdf.roundRect(24, bottom, WIDTH - 48, top - bottom, 10, fill=1, stroke=1)


def pill(pdf, x, y, value, fill=PINK, color=white):
    width = pdf.stringWidth(value, "SFR-Bold", 10) + 18
    pdf.setFillColor(fill)
    pdf.roundRect(x, y - 5, width, 17, 5, fill=1, stroke=0)
    text(pdf, x + 9, y, value, 10, True, color)
    return width


def header(pdf, subtitle):
    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(PINK)
    pdf.rect(0, HEIGHT - 118, WIDTH, 118, fill=1, stroke=0)
    pdf.drawImage(str(ROOT / "commun/img/logo-unac-blanc.png"), WIDTH - 95, 742,
                  width=60, height=64, preserveAspectRatio=True, mask="auto")
    text(pdf, MARGIN, 790, "CONTRIBUTION", 19, color=white, font="Novotype-Regular")
    text(pdf, MARGIN, 765, "NEWSLETTER", 24, color=white, font="Novotype-Medium")
    text(pdf, MARGIN, 745, f"Air France · {subtitle}", 9, color=white)
    text(pdf, MARGIN, 731, "Remplissez, enregistrez le PDF puis renvoyez-le : il s’importe tel quel dans l’outil Newsletter de l’Atelier UNAC.", 8, color=white)


def footer(pdf, page):
    text(pdf, 24, 28, "UNAC · Newsletter · Contribution", 8, color=MUTED)
    pdf.drawRightString(WIDTH - 24, 28, f"{page} / {TOTAL}")
    pdf.showPage()


def rubrique(pdf, index, top, height):
    bottom = top - height
    card(pdf, bottom, top)
    text(pdf, MARGIN, top - 20, f"RUBRIQUE {index}", 10, True, PINK)
    label(pdf, MARGIN, top - 38, "Titre")
    field(pdf, f"nl_s{index}_titre", f"Rubrique {index} - titre", MARGIN, top - 60, BODY, 18, limit=90)
    label(pdf, MARGIN, top - 74, "Texte")
    field(pdf, f"nl_s{index}_texte", f"Rubrique {index} - texte", MARGIN, bottom + 12, BODY, height - 92, True)


def generate():
    pdf = Canvas(str(ROOT / "formulaires/newsletter-contribution.pdf"), pagesize=A4)
    pdf.setTitle("Contribution à la newsletter UNAC")
    pdf.setAuthor("UNAC Air France")

    header(pdf, "Écrivez simplement : la mise en page se fait toute seule")
    card(pdf, 586, 704)
    half = (BODY - 12) / 2
    label(pdf, MARGIN, 686, "Votre nom")
    label(pdf, MARGIN + half + 12, 686, "Mois de parution")
    field(pdf, "nl_redacteur", "Votre nom", MARGIN, 664, half, 18)
    field(pdf, "nl_mois", "Mois de parution (ex. décembre 2026)", MARGIN + half + 12, 664, half, 18, limit=20)
    label(pdf, MARGIN, 648, "Titre de la newsletter (ex. Mutuelle MNPAF)")
    field(pdf, "nl_titre", "Titre de la newsletter", MARGIN, 626, BODY, 18, limit=60)
    text(pdf, MARGIN, 608, "Astuce : une ligne qui commence par « - » devient une puce ; par « Attention : » ou « À noter : »,", 8.5, color=MUTED)
    text(pdf, MARGIN, 597, "un encadré de couleur. Pour le reste, écrivez comme dans un e-mail.", 8.5, color=MUTED)
    field(pdf, "nl_v1", "Version du formulaire", 0, 0, 1, 1, value="NL2", readonly=True)
    rubrique(pdf, 1, 572, 252)
    rubrique(pdf, 2, 308, 252)
    footer(pdf, 1)

    for page, first in ((2, 3), (3, 6)):
        header(pdf, "Les rubriques (laissez vides celles qui ne servent pas)")
        for k in range(3):
            if first + k <= SECTIONS:
                rubrique(pdf, first + k, 704 - k * 218, 206)
        footer(pdf, page)
    pdf.save()


if __name__ == "__main__":
    font_dir = Path(os.environ.get("UNAC_PDF_FONT_DIR", Path.home() / "Library/Fonts"))
    for family, filename in (
        ("SFR-Regular", "UNAC Regular.ttf"),
        ("SFR-Bold", "UNAC-bold.ttf"),
        ("Novotype-Regular", "Novotype_Regular.ttf"),
        ("Novotype-Medium", "Novotype_Medium.ttf"),
    ):
        pdfmetrics.registerFont(TTFont(family, str(font_dir / filename)))
    generate()
