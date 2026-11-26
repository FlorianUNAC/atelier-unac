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
BREF = 6
TOTAL = 2 + SECTIONS // 2


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


def page_one(pdf):
    header(pdf, "Le texte, sans se soucier de la mise en page")

    # La newsletter
    card(pdf, 566, 704)
    text(pdf, MARGIN, 688, "LA NEWSLETTER", 10, True, PINK)
    half = (BODY - 12) / 2
    label(pdf, MARGIN, 674, "Rédigé par")
    label(pdf, MARGIN + half + 12, 674, "Mois de parution (ex. 2026-12 ou décembre 2026)")
    field(pdf, "nl_redacteur", "Rédigé par", MARGIN, 652, half, 18)
    field(pdf, "nl_mois", "Mois de parution", MARGIN + half + 12, 652, half, 18, limit=20)
    label(pdf, MARGIN, 638, "Titre (ex. Mutuelle)")
    label(pdf, MARGIN + half + 12, 638, "Suite du titre, en gras (ex. MNPAF)")
    field(pdf, "nl_titreA", "Titre", MARGIN, 616, half, 18, limit=40)
    field(pdf, "nl_titreB", "Suite du titre en gras", MARGIN + half + 12, 616, half, 18, limit=40)
    label(pdf, MARGIN, 602, "Sous-titre (facultatif)")
    field(pdf, "nl_sous", "Sous-titre", MARGIN, 580, BODY, 18, limit=110)
    field(pdf, "nl_v1", "Version du formulaire", 0, 0, 1, 1, value="NL1", readonly=True)

    # En bref
    card(pdf, 334, 554)
    pill(pdf, MARGIN, 534, "En bref")
    text(pdf, MARGIN + 70, 534, "Jusqu’à six points courts : une question et sa réponse.", 9, color=MUTED)
    q_width = 190
    label(pdf, MARGIN, 516, "Question (en gras)")
    label(pdf, MARGIN + q_width + 10, 516, "Réponse")
    for i in range(1, BREF + 1):
        y = 494 - (i - 1) * 25.5
        field(pdf, f"nl_bref_q_{i}", f"En bref {i} - question", MARGIN, y, q_width, 18, limit=70)
        field(pdf, f"nl_bref_r_{i}", f"En bref {i} - réponse", MARGIN + q_width + 10, y, BODY - q_width - 10, 18, limit=120)

    # Accroche
    card(pdf, 178, 322)
    pill(pdf, MARGIN, 302, "Le message de la section")
    text(pdf, MARGIN + 165, 302, "Encadré en première page (facultatif).", 9, color=MUTED)
    field(pdf, "nl_accroche", "Message de la section", MARGIN, 192, BODY, 100, True)

    # Comment écrire
    pdf.setFillColor(PALE)
    pdf.roundRect(24, 50, WIDTH - 48, 116, 10, fill=1, stroke=0)
    text(pdf, MARGIN, 148, "COMMENT ÉCRIRE", 10, True, PINK)
    tips = [
        ("Une rubrique par sujet", "un titre, le texte, et si besoin un encadré ou une mise en garde (pages suivantes)."),
        ("- texte", "en début de ligne : une puce.            1) texte : une étape numérotée."),
        ("**mot**", "entre deux paires d’étoiles : en gras.     > texte : une petite note grise."),
        ("Pas de mise en page", "l’outil choisit les couleurs, les pictos, les colonnes et répartit les pages."),
    ]
    for i, (key, value) in enumerate(tips):
        y = 130 - i * 18
        text(pdf, MARGIN, y, key, 9, True, INK)
        text(pdf, MARGIN + 112, y, value, 9, color=INK)
    footer(pdf, 1)


def rubrique(pdf, index, top):
    bottom = top - 318
    card(pdf, bottom, top)
    width = pill(pdf, MARGIN, top - 20, f"Rubrique {index}")
    text(pdf, MARGIN + width + 10, top - 20, "Laissez vide si inutile.", 8.5, color=MUTED)
    half = (BODY - 12) / 2
    p = f"nl_s{index}_"
    y = top - 40
    label(pdf, MARGIN, y, "Titre (ex. Retraite :)")
    label(pdf, MARGIN + half + 12, y, "Suite du titre, en rose (ex. ce qui évolue)")
    field(pdf, p + "titreA", f"Rubrique {index} - titre", MARGIN, y - 22, half, 18, limit=60)
    field(pdf, p + "titreB", f"Rubrique {index} - suite du titre", MARGIN + half + 12, y - 22, half, 18, limit=60)
    y -= 36
    label(pdf, MARGIN, y, "Texte")
    field(pdf, p + "texte", f"Rubrique {index} - texte", MARGIN, y - 112, BODY, 106, True)
    y -= 126
    label(pdf, MARGIN, y, "Encadré : titre (ex. Bon à savoir)")
    label(pdf, MARGIN + 170, y, "Encadré : texte")
    field(pdf, p + "enc_titre", f"Rubrique {index} - titre de l'encadré", MARGIN, y - 46, 160, 40, True, 60)
    field(pdf, p + "enc_texte", f"Rubrique {index} - texte de l'encadré", MARGIN + 170, y - 46, BODY - 170, 40, True)
    y -= 60
    label(pdf, MARGIN, y, "Attention / mise en garde (facultatif)")
    field(pdf, p + "attention", f"Rubrique {index} - attention", MARGIN, y - 40, BODY, 34, True)


def page_last(pdf):
    header(pdf, "Pour la mise en page")
    card(pdf, 430, 704)
    pill(pdf, MARGIN, 684, "Remarques pour la mise en page")
    text(pdf, MARGIN, 662, "Une photo, un document à joindre, une rubrique à mettre en avant, une date de diffusion… (non publié)", 9, color=MUTED)
    field(pdf, "nl_remarques", "Remarques pour la mise en page", MARGIN, 446, BODY, 204, True)
    pdf.setFillColor(PALE)
    pdf.roundRect(24, 330, WIDTH - 48, 86, 10, fill=1, stroke=0)
    text(pdf, MARGIN, 396, "ET ENSUITE ?", 10, True, PINK)
    for i, line in enumerate([
        "1) Enregistrez ce PDF (Fichier › Enregistrer), sans l’imprimer en PDF : les champs seraient perdus.",
        "2) Renvoyez-le par e-mail à la personne qui met en page la newsletter.",
        "3) Il est déposé dans l’outil Newsletter de l’Atelier UNAC : la mise en page se fait toute seule.",
    ]):
        text(pdf, MARGIN, 376 - i * 17, line, 9, color=INK)
    footer(pdf, TOTAL)


def generate():
    pdf = Canvas(str(ROOT / "formulaires/newsletter-contribution.pdf"), pagesize=A4)
    pdf.setTitle("Contribution à la newsletter UNAC")
    pdf.setAuthor("UNAC Air France")
    page_one(pdf)
    for page in range(SECTIONS // 2):
        header(pdf, "Les rubriques")
        rubrique(pdf, page * 2 + 1, 704)
        rubrique(pdf, page * 2 + 2, 372)
        footer(pdf, page + 2)
    page_last(pdf)
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
