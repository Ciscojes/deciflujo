import type { OpenItemRepository } from "../ports/open-item-repository";
import {
  openItemInputSchema,
  type OpenItemInput,
} from "../open-item-input";

export async function createOpenItem(
  repository: OpenItemRepository,
  input: OpenItemInput,
) {
  return repository.create(openItemInputSchema.parse(input));
}
