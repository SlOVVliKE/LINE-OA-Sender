export function buildLineMessages({ messageText = "", image }) {
  const messages = [];
  const trimmed = messageText.trim();

  if (trimmed) {
    messages.push({
      type: "text",
      text: trimmed
    });
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
