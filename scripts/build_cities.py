"""Справочник городов России для подсказок в форме.
Источник: hflabs/city (https://github.com/hflabs/city), лицензия CC BY-SA 4.0, данные ФИАС."""
import csv, json, pathlib, sys
src, out = sys.argv[1], pathlib.Path(sys.argv[2])
rows = list(csv.DictReader(open(src, encoding='utf-8')))
SPECIAL = {
  ('Респ', 'Кабардино-Балкарская'): 'Кабардино-Балкарская Республика',
  ('Респ', 'Карачаево-Черкесская'): 'Карачаево-Черкесская Республика',
  ('Респ', 'Удмуртская'): 'Удмуртская Республика',
  ('Респ', 'Чеченская'): 'Чеченская Республика',
  ('Респ', 'Саха /Якутия/'): 'Республика Саха (Якутия)',
  ('Респ', 'Северная Осетия - Алания'): 'Республика Северная Осетия — Алания',
  ('Чувашия', 'Чувашская Республика'): 'Чувашская Республика',
  ('АО', 'Ханты-Мансийский Автономный округ - Югра'): 'Ханты-Мансийский автономный округ — Югра',
  ('обл', 'Кемеровская область - Кузбасс'): 'Кемеровская область — Кузбасс',
}
def region_name(t, r):
    if (t, r) in SPECIAL: return SPECIAL[(t, r)]
    return {'Респ': f'Республика {r}', 'обл': f'{r} область', 'край': f'{r} край', 'АО': f'{r} автономный округ',
            'Аобл': f'{r} автономная область', 'г': 'город федерального значения'}[t]
regions, data, seen = [], [], set()
for r in rows:
    name = r['city'] or (r['area'] if r['area_type'] == 'г' else '') or r['settlement'] or r['region']
    reg = region_name(r['region_type'], r['region'])
    if reg not in regions: regions.append(reg)
    key = (name, reg)
    if key in seen: continue
    seen.add(key)
    data.append([name, regions.index(reg), int(r['population'] or 0), r['fias_id']])
data.sort(key=lambda x: -x[2])
js = ('/* Города России для подсказок в поле «Город».\n'
      '   Источник: hflabs/city, https://github.com/hflabs/city — лицензия CC BY-SA 4.0 (данные ФИАС). Этот файл распространяется на тех же условиях.\n'
      '   Формат: [название, номер региона, население, код ФИАС]. */\n'
      'window.TEACHNET_CITIES={regions:' + json.dumps(regions, ensure_ascii=False, separators=(',', ':')) +
      ',list:' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '};\n')
out.write_text(js, encoding='utf-8')
print(len(data), 'городов,', len(regions), 'регионов,', len(js.encode()) // 1024, 'КБ')
print(data[:5])
