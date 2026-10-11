"""Проверка PDF «значок в натуральную величину» после tests/pcb/pdf.e2e.mjs.

    python3 tests/pcb/check_pdf.py <папка с PDF и manifest.json>

Нужны PyMuPDF (pip install pymupdf) и OpenCV (pip install opencv-python-headless).
Проверяет: страница A4 210 × 297 мм; картинки лица и оборота ровно в габарите из PRINT_SIZES (±0,2 мм) и не выходят
за страницу; контур карты 85,6 × 54 мм и отрезок 50 мм; русский текст извлекается без «кракозябр»; QR-код считывается
со страницы, растеризованной в 300 dpi; файл не больше 3 МБ.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pymupdf

MM = 72 / 25.4  # pt в 1 мм
SIZES = {('round', 'S'): (38, 38), ('round', 'M'): (50, 50), ('rect', 'M'): (60, 35), ('rect', 'L'): (80, 50), ('badge', 'L'): (55, 85)}
TEXTS = ['Ваш значок в натуральную величину', 'Лицо', 'Оборот', 'Приложите карту:', 'совпало — масштаб верный',
         'Печатайте в масштабе 100%', 'Фактический размер', 'TEACHNET', '+7 993 415-14-34', '@teachnet_school',
         'Концепт. Точный макет пришлём после заявки.', '50 мм']

passed = failed = 0


def ok(cond, name, extra=''):
    global passed, failed
    if cond:
        passed += 1
        print('  ✓', name)
    else:
        failed += 1
        print('  ✗', name, extra)


def near(a, b, tol=0.2):
    return abs(a - b) <= tol


def read_qr(img):
    det = cv2.QRCodeDetector()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    for g in (gray, 255 - gray):
        text, _, _ = det.detectAndDecode(g)
        if text:
            return text
    return ''


def main(folder):
    out = Path(folder)
    for case in json.loads((out / 'manifest.json').read_text(encoding='utf-8')):
        f = Path(case['file'])
        name = f.stem
        print('—', name)
        doc = pymupdf.open(f)
        ok(len(doc) == 1, f'{name}: одна страница')
        page = doc[0]
        ok(near(page.rect.width / MM, 210) and near(page.rect.height / MM, 297), f'{name}: A4 210 × 297 мм',
           f'{page.rect.width / MM:.2f} × {page.rect.height / MM:.2f}')
        w, h = SIZES[(case['shape'], case['cls'])]
        imgs = [page.get_image_bbox(i) for i in page.get_images(full=True)]
        boards = [r for r in imgs if near(r.width / MM, w) and near(r.height / MM, h)]
        ok(len(boards) == 2, f'{name}: лицо и оборот ровно {w} × {h} мм', [f'{r.width / MM:.2f}×{r.height / MM:.2f}' for r in imgs])
        ok(all(r.x0 >= 0 and r.y0 >= 0 and r.x1 <= page.rect.width and r.y1 <= page.rect.height for r in imgs), f'{name}: картинки на странице целиком')
        if len(boards) == 2:
            a, b = sorted(boards, key=lambda r: r.x0)
            ok(a.x1 < b.x0, f'{name}: лицо и оборот не наезжают друг на друга')
        drawings = page.get_drawings()
        card = [d for d in drawings if near(d['rect'].width / MM, 85.6, 0.3) and near(d['rect'].height / MM, 54, 0.3)]
        ok(len(card) >= 1, f'{name}: контур карты 85,6 × 54 мм')
        ruler = [d for d in drawings for it in d['items'] if it[0] == 'l' and near(abs(it[2].x - it[1].x) / MM, 50, 0.1) and abs(it[2].y - it[1].y) < 0.01]
        ok(len(ruler) >= 1, f'{name}: отрезок 50 мм')
        text = page.get_text()
        missing = [t for t in TEXTS if t not in text]
        ok(not missing, f'{name}: русский текст извлекается', missing)
        ok(f.stat().st_size <= 3 * 1024 * 1024, f'{name}: файл {f.stat().st_size // 1024} КБ (не больше 3 МБ)')
        if case.get('qr'):
            pix = page.get_pixmap(dpi=300)
            img = cv2.cvtColor(np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n), cv2.COLOR_RGB2BGR)
            back = boards and sorted(boards, key=lambda r: r.x0)[-1]
            if back:
                k = 300 / 72
                crop = img[int(back.y0 * k):int(back.y1 * k), int(back.x0 * k):int(back.x1 * k)]
                crop = cv2.copyMakeBorder(crop, 60, 60, 60, 60, cv2.BORDER_REPLICATE)
                got = read_qr(crop)
            else:
                got = read_qr(img)
            ok(got == case['qr'], f'{name}: QR считывается со страницы в 300 dpi', repr(got))
    print(f'\n{passed} ✓, {failed} ✗')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
