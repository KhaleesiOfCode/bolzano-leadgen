"""Seed default email templates per business group/subgroup."""
from app.campaign_models import EmailTemplate

DEFAULT_TEMPLATES: list[dict] = [
    # ── Food & Dining ──────────────────────────────────────
    {
        "name": "Restaurant Website Offer",
        "business_group": "food",
        "business_subgroup": "restaurant",
        "subject": "A modern website for {{name}} in {{city}}",
        "body": """Hi {{name}},

I noticed {{business}} in {{city}} and wanted to reach out. These days, most customers find restaurants online first — they check the menu, read reviews, and look at photos before deciding where to eat.

A clean, mobile-friendly website can make a huge difference. Here's what I can help with:

• A beautiful menu display with photos and pricing
• Online reservation or delivery integration
• Google Maps and contact info
• Social media links (Instagram, Facebook)

Would you be open to a quick chat about improving your online presence? No pressure, just happy to share a few ideas.

Best regards""",
    },
    {
        "name": "Cafe Website Offer",
        "business_group": "food",
        "business_subgroup": "cafe",
        "subject": "Helping {{name}} in {{city}} attract more customers online",
        "body": """Hi {{name}},

I came across {{business}} in {{city}} and wanted to introduce myself. I help local cafes like yours build a stronger online presence so more customers can find you.

Here's what a simple website could do for you:

• Showcase your menu and daily specials
• Display beautiful photos of your space and drinks
• Link to your Instagram for updates
• Share your location, hours, and contact info

No commitment — just offering to help. Let me know if you'd be interested!

Best regards""",
    },
    {
        "name": "Bar/Pub Website Offer",
        "business_group": "food",
        "business_subgroup": "bar",
        "subject": "A website for {{name}} — events, drinks, and more",
        "body": """Hi {{name}},

I visited {{business}} in {{city}} and think it has great potential to attract even more customers with a simple website. A website helps people find your events, see your drink menu, and get a feel for the atmosphere before they visit.

I can help you set up something clean and professional that includes:

• Event calendar and promotions
• Drink menu and photos
• Contactless ordering (if needed)
• Location and opening hours

Want to hear a few ideas? Happy to have a quick chat.

Best regards""",
    },
    {
        "name": "Bakery/Pastry Website Offer",
        "business_group": "food",
        "business_subgroup": "bakery",
        "subject": "Showcasing {{name}}'s baked goods online",
        "body": """Hi {{name}},

Good bakeries deserve to be seen. I help bakeries like {{business}} in {{city}} build beautiful websites where customers can browse treats, see photos, and get inspired before visiting.

A simple website can feature:

• Gorgeous photos of your products
• Daily menu or specials
• Order-ahead option
• Location, hours, and contact info

I'd love to help you show off your work online. Let me know if you'd like to chat!

Best regards""",
    },
    {
        "name": "Food Business General (no subgroup match)",
        "business_group": "food",
        "business_subgroup": None,
        "subject": "Helping {{name}} in {{city}} grow online",
        "body": """Hi {{name}},

I'm reaching out because I help food businesses like {{business}} in {{city}} attract more customers through a better online presence.

A simple, professional website can help people discover your menu, find your location, and get in touch — all from their phone.

I'd love to share a few ideas with you. No obligation, just a friendly conversation.

Best regards""",
    },

    # ── Beauty & Personal Care ─────────────────────────────
    {
        "name": "Hair Salon Website Offer",
        "business_group": "beauty",
        "business_subgroup": "hair_salon",
        "subject": "A beautiful website for {{name}} in {{city}}",
        "body": """Hi {{name}},

I reached out because I help hair salons like {{business}} in {{city}} attract more clients with a professional website.

These days, people look up salons online before booking. A website helps you:

• Showcase your work with before/after photos
• List your services and prices
• Accept online bookings (Booksy, Treatwell integration)
• Share your location and contact info

Would you be open to a quick 10-minute chat? I'd love to hear about your salon and share a few ideas.

Best regards""",
    },
    {
        "name": "Beauty Salon/General Website Offer",
        "business_group": "beauty",
        "business_subgroup": "beauty_salon",
        "subject": "Growing {{name}}'s online presence in {{city}}",
        "body": """Hi {{name}},

I help beauty salons like {{business}} in {{city}} build their online presence so more clients can find them.

A professional website can make all the difference:

• Showcase your services and treatments
• Display your portfolio and results
• Enable online booking and inquiries
• Connect your Instagram and Facebook

I'd love to chat about what a website could do for your business. Let me know!

Best regards""",
    },
    {
        "name": "Nail Salon Website Offer",
        "business_group": "beauty",
        "business_subgroup": "nail_salon",
        "subject": "Helping {{name}} in {{city}} get discovered online",
        "body": """Hi {{name}},

I help nail salons like {{business}} in {{city}} reach more clients through simple, beautiful websites.

Your work is visual — a website is the perfect place to show it off:

• Gallery of your best nail art
• Service menu with pricing
• Online booking integration
• Location, hours, and contact info

Want to see a few examples? Happy to share some ideas that have worked for other salons.

Best regards""",
    },
    {
        "name": "Beauty Business General (no subgroup match)",
        "business_group": "beauty",
        "business_subgroup": None,
        "subject": "A website for {{name}} in {{city}}",
        "body": """Hi {{name}},

I help beauty and personal care businesses like {{business}} in {{city}} build a stronger online presence.

A professional website can help you attract more clients, showcase your work, and make booking easy. I'd love to share some simple ideas that could make a big difference.

No pressure — just offering to help. Let me know if you're open to a quick chat!

Best regards""",
    },

    # ── Digital Marketing ──────────────────────────────────
    {
        "name": "Digital Agency Website Offer",
        "business_group": "digital_marketing",
        "business_subgroup": "digital_agency",
        "subject": "Collaboration idea for {{name}} in {{city}}",
        "body": """Hi {{name}},

I noticed {{business}} in {{city}} and wanted to reach out with a potential collaboration idea.

I specialize in building websites for local businesses, and I'm looking for a trusted digital marketing partner to refer clients to — and receive referrals from.

Here's what I'm thinking:

• I handle website development for your clients
• You handle SEO, ads, and social media for mine
• We refer each other to grow both businesses

Would you be open to a coffee and a chat about how we could work together?

Best regards""",
    },
    {
        "name": "IT/Web Design Agency Collaboration",
        "business_group": "digital_marketing",
        "business_subgroup": "web_design",
        "subject": "Partnership idea for {{name}} in {{city}}",
        "body": """Hi {{name}},

I run a web development studio and I'm looking to connect with other digital professionals in {{city}} who might want to collaborate.

Since {{business}} is in web design, we could partner to offer clients a fuller service — design + development. Or if you're overloaded, I can help with development projects as a white-label partner.

Let me know if this sounds interesting. Happy to grab a coffee!

Best regards""",
    },
    {
        "name": "Marketing Agency Collaboration",
        "business_group": "digital_marketing",
        "business_subgroup": "marketing_agency",
        "subject": "Let's partner — {{name}} x Web Development",
        "body": """Hi {{name}},

I help businesses build websites and I'm looking for marketing agencies in {{city}} to partner with.

Many of my clients need SEO, ads, and social media after their site is built — and that's where you come in. I refer clients who need marketing services, and you refer clients who need websites. Win-win.

Simple as that. Want to chat about it?

Best regards""",
    },
    {
        "name": "Digital Marketing General (no subgroup match)",
        "business_group": "digital_marketing",
        "business_subgroup": None,
        "subject": "Collaboration idea for {{name}} in {{city}}",
        "body": """Hi {{name}},

I build websites for local businesses in {{city}} and I'm looking for digital professionals to partner with.

I send clients to marketing partners, and they send website projects to me. If you're interested in a referral partnership, I'd love to hear more about what {{business}} does.

Let me know if you'd be up for a quick chat!

Best regards""",
    },

    # ── Healthcare ─────────────────────────────────────────
    {
        "name": "Healthcare Practice Website",
        "business_group": "healthcare",
        "business_subgroup": None,
        "subject": "A professional website for {{name}} in {{city}}",
        "body": """Hi {{name}},

I help healthcare professionals like {{business}} in {{city}} build professional websites that help patients find and trust them.

A clean, reassuring website can include:

• Your services and specializations
• Online booking or appointment requests
• Location, hours, and contact info
• Patient testimonials and credentials

I'd love to chat about how we can create something that reflects the quality of your practice.

Best regards""",
    },

    # ── Services (General) ─────────────────────────────────
    {
        "name": "Service Business Website",
        "business_group": "services",
        "business_subgroup": None,
        "subject": "Helping {{name}} in {{city}} get found online",
        "body": """Hi {{name}},

I help local service businesses like {{business}} in {{city}} attract more customers with a professional website.

A website helps people find you, learn about your services, and get in touch — all from their phone. I keep things simple and affordable.

Here's what I typically include:

• Services and pricing
• Contact form and phone number
• Location and hours
• Google Maps integration

Would you be open to a quick chat? No obligation.

Best regards""",
    },
    {
        "name": "Fitness/Sports Centre Website",
        "business_group": "services",
        "business_subgroup": "fitness_centre",
        "subject": "A website for {{name}} in {{city}}",
        "body": """Hi {{name}},

I help fitness centres like {{business}} in {{city}} attract more members with a great website.

A website can showcase:

• Classes and schedules
• Membership pricing
• Trainer profiles
• Photos of your facility
• Sign-up and contact forms

Let me know if you're interested in seeing some examples. Happy to help!

Best regards""",
    },

    # ── Fallback (any group not matched above) ─────────────
    {
        "name": "General Business Website Offer",
        "business_group": None,
        "business_subgroup": None,
        "subject": "A website for {{name}} in {{city}}",
        "body": """Hi {{name}},

I help businesses like {{business}} in {{city}} build a stronger online presence. A simple, professional website can help more customers find you, learn about your services, and get in touch.

I'd love to share some ideas tailored to your business — no obligation, just a friendly conversation.

Let me know if you're interested!

Best regards""",
    },
]


def seed_templates(db_session):
    """Insert default templates if none exist for a group."""
    existing = db_session.query(EmailTemplate).count()
    if existing > 0:
        return

    for tmpl_data in DEFAULT_TEMPLATES:
        tmpl = EmailTemplate(**tmpl_data)
        db_session.add(tmpl)
    db_session.commit()
