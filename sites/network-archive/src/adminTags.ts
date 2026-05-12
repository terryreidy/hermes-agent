export function tagsToText(tags: string[]) {
  return tags.join(', ')
}

export function textToTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}
