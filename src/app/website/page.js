"use client";

import { useEffect, useState } from "react";
import EditableList from "@/components/EditableList";
import RequireStaff from "@/components/RequireStaff";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const SECTIONS = [
  {
    title: "Header & Navigation",
    description: "The sticky top bar shown on the public homepage.",
    fields: [
      { name: "app_badge_text", label: "App badge text", type: "text" },
      { name: "nav_cta_text", label: "Login button text", type: "text" },
    ],
  },
  {
    title: "Hero",
    description: "The big banner at the top of the homepage.",
    fields: [
      { name: "hero_headline", label: "Headline (use a line break for a 2-line title)", type: "textarea" },
      { name: "hero_subtitle", label: "Subtitle", type: "textarea" },
      { name: "hero_cta_primary_text", label: "Primary button text", type: "text" },
      { name: "hero_cta_primary_link", label: "Primary button link", type: "text" },
      { name: "hero_cta_secondary_text", label: "Secondary link text", type: "text" },
      { name: "hero_cta_secondary_link", label: "Secondary link URL", type: "text" },
      { name: "hero_badge_icon", label: "Callout icon (emoji)", type: "text" },
      { name: "hero_badge_title", label: "Callout title", type: "text" },
      { name: "hero_badge_tag", label: "Callout tag (e.g. LIVE)", type: "text" },
      { name: "hero_badge_subtitle", label: "Callout subtitle", type: "text" },
      { name: "hero_badge_cta_text", label: "Callout link text", type: "text" },
      { name: "hero_badge_link", label: "Callout link URL", type: "text" },
    ],
  },
  {
    title: "Test Series / Stats section",
    description: "The section with the phone preview and description.",
    fields: [
      { name: "stats_icon", label: "Icon (emoji)", type: "text" },
      { name: "stats_headline", label: "Headline", type: "text" },
      { name: "stats_headline_highlight", label: "Word in headline to highlight", type: "text" },
      { name: "stats_body", label: "Body text", type: "textarea" },
      { name: "stats_cta_text", label: "Link text", type: "text" },
      { name: "stats_cta_link", label: "Link URL", type: "text" },
    ],
  },
  {
    title: "Features section heading",
    description: "Heading above the numbered feature grid (the list items are managed below).",
    fields: [
      { name: "features_heading", label: "Heading", type: "text" },
      { name: "features_heading_highlight", label: "Word in heading to highlight", type: "text" },
    ],
  },
  {
    title: "Courses section heading",
    description: "Heading above the course cards (the cards are managed below).",
    fields: [
      { name: "courses_eyebrow", label: "Small label above heading", type: "text" },
      { name: "courses_heading", label: "Heading", type: "text" },
      { name: "courses_subtitle", label: "Subtitle", type: "textarea" },
    ],
  },
  {
    title: "Footer",
    description: "The dark bar at the bottom of the homepage.",
    fields: [{ name: "footer_copyright", label: "Copyright line", type: "text" }],
  },
];

function SettingsSection({ section, values, onChange }) {
  return (
    <div className="hm-card p-5">
      <h3 className="text-sm font-bold text-[var(--color-text)]">{section.title}</h3>
      {section.description && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{section.description}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {section.fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-text-muted)]">{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                rows={3}
                value={values[field.name] ?? ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="hm-input"
              />
            ) : (
              <input
                value={values[field.name] ?? ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="hm-input"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WebsiteContent() {
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/site-settings/").then(setValues);
  }, []);

  function update(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await api.patch("/site-settings/", values);
      setValues(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Website</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Edit the public homepage — header, hero, sections and footer — without touching code. Changes appear on{" "}
        <a href="http://localhost:3000/" target="_blank" rel="noreferrer" className="text-brand-blue">
          the live site
        </a>{" "}
        as soon as you save.
      </p>

      {values && (
        <form onSubmit={saveSettings} className="mt-6 flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <SettingsSection key={section.title} section={section} values={values} onChange={update} />
          ))}

          {error && <p className="text-xs font-medium text-brand-red">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="hm-btn-primary">
              {saving ? "Saving..." : "Save homepage settings"}
            </button>
            {savedAt && <span className="text-xs text-brand-green">Saved ✓</span>}
          </div>
        </form>
      )}

      <div className="mt-8 flex flex-col gap-5">
        <EditableList
          title={"Feature grid ('What makes Dr. Gutka complete?')"}
          description="The 6 numbered tiles on the homepage."
          endpoint="/home-features/"
          itemLabel={(f) => `${f.number} — ${f.title}`}
          itemMeta={(f) => f.body}
          fields={[
            { name: "number", label: "Number (e.g. 01)", type: "text", required: true },
            { name: "title", label: "Title", type: "text", required: true },
            { name: "body", label: "Body", type: "textarea", required: true },
            { name: "order", label: "Order", type: "number", default: 0 },
          ]}
        />

        <div className="hm-card p-5">
          <h3 className="text-sm font-bold text-[var(--color-text)]">Course cards</h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            The track cards in the &quot;Choose your course&quot; section now come directly from{" "}
            <a href="/courses" className="font-semibold text-brand-blue">
              Courses
            </a>{" "}
            — every active course appears there automatically, with its icon, color and description. Add, edit or
            deactivate a course on that page to change what shows on the homepage.
          </p>
        </div>

        <EditableList
          title="Navbar links"
          description="Links shown in the top navigation bar."
          endpoint="/site-links/?section=nav"
          fixedValues={{ section: "nav" }}
          itemLabel={(l) => l.label}
          itemMeta={(l) => l.url}
          fields={[
            { name: "label", label: "Label", type: "text", required: true },
            { name: "url", label: "URL", type: "text", required: true },
            { name: "order", label: "Order", type: "number", default: 0 },
          ]}
        />

        <EditableList
          title="Footer links"
          description="Links shown in the footer."
          endpoint="/site-links/?section=footer"
          fixedValues={{ section: "footer" }}
          itemLabel={(l) => l.label}
          itemMeta={(l) => l.url}
          fields={[
            { name: "label", label: "Label", type: "text", required: true },
            { name: "url", label: "URL", type: "text", required: true },
            { name: "order", label: "Order", type: "number", default: 0 },
          ]}
        />
      </div>
    </div>
  );
}

export default function WebsitePage() {
  return (
    <RequireStaff feature="website_settings">
      <Shell>
        <WebsiteContent />
      </Shell>
    </RequireStaff>
  );
}
