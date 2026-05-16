import sys; sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import Lead
from sqlalchemy import func

db = SessionLocal()
total = db.query(Lead).count()
no_website = db.query(Lead).filter(Lead.has_website.is_(False)).count()
with_email_no_website = db.query(Lead).filter(Lead.has_website.is_(False), Lead.has_email.is_(True)).count()
digital_marketing = db.query(Lead).filter(Lead.business_group == 'digital_marketing').count()

by_group = db.query(Lead.business_group, Lead.has_website, func.count(Lead.id)).group_by(Lead.business_group, Lead.has_website).order_by(Lead.business_group).all()
by_status = db.query(Lead.lead_status, func.count(Lead.id)).group_by(Lead.lead_status).all()

print(f'Total leads: {total}')
print(f'No website: {no_website}')
print(f'With email but no website: {with_email_no_website}')
print(f'Digital marketing: {digital_marketing}')
print()
print('By group x has_website:')
for g, hw, c in by_group:
    g = g or 'unknown'
    hw_str = 'yes' if hw else 'no'
    print(f'  {g:25s} | website={hw_str}: {c}')
print()
print('By status:')
for s, c in by_status:
    print(f'  {s}: {c}')

sample = db.query(Lead).filter(Lead.has_website.is_(False)).limit(5).all()
print('\n--- Sample leads without website ---')
for l in sample:
    print(f'  #{l.id}: {l.name} | {l.business_group}/{l.business_subgroup} | {l.city} | email={l.email} | score={l.lead_score}')

dm_sample = db.query(Lead).filter(Lead.business_group == 'digital_marketing').limit(5).all()
print('\n--- Sample digital marketing leads ---')
for l in dm_sample:
    print(f'  #{l.id}: {l.name} | {l.business_subgroup} | {l.city} | email={l.email} | website={l.website}')

db.close()
