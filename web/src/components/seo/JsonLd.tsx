/**
 * One schema.org block, serialised for a <script> element.
 *
 * `<` is escaped so a value containing "</script>" can never close the tag —
 * the data is ours, but a deputy's name or an institution label is still
 * arbitrary text.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
