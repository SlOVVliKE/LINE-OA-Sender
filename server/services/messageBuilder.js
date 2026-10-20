export function buildLineMessages({ messageText = "", image, mentionUserIds = [] }) {
  const messages = [];
  const trimmed = messageText.trim();

  if (trimmed) {
    if (mentionUserIds.length) {
      const substitution = {};
      let text = trimmed.replaceAll("{", "{{").replaceAll("}", "}}");
      mentionUserIds.slice(0, 20).forEach((userId, index) => {
        const key = `mention${index}`;
        const marker = `{${key}}`;
        substitution[key] = {
          type: "mention",
          mentionee: { type: "user", userId }
        };
        text = `${text}${index === 0 ? "\n" : " "}${marker}`;
      });
      messages.push({ type: "textV2", text, substitution });
    } else {
      messages.push({ type: "text", text: trimmed });
    }
  }

  if (image) {
    messages.push({
      type: "image",
      originalContentUrl: image.original_url,
      previewImageUrl: image.preview_url
    });
  }

  return messages;
}
