// Handler implementation for createContact

import { Effect, Layer } from "effect";

import type { Contact, ContactId } from "@address-book/contacts-dsl";
import { DuplicateEmailError } from "@address-book/contacts-dsl";
import { ContactRepository, IdGenerator } from "../../services";

import { CreateContactHandler } from "./handler";

export const CreateContactHandlerLive = Layer.effect(
	CreateContactHandler,
	Effect.gen(function* () {
		const idGen = yield* IdGenerator;
		const repo = yield* ContactRepository;

		return {
			handle: (params, _options) =>
				Effect.gen(function* () {
					const existing = yield* repo.findAll().pipe(Effect.orDie);
					const duplicate = existing.items.find(
						(c) => c.email === params.email,
					);
					if (duplicate) {
						return yield* Effect.fail(
							new DuplicateEmailError({
								message: `Contact with email ${params.email} already exists`,
							}),
						);
					}

					const id = (yield* idGen.generate()) as ContactId;
					const contact: Contact = {
						id,
						name: params.name,
						phone: params.phone,
						email: params.email,
						address: params.address,
					};
					yield* repo.save(contact).pipe(Effect.orDie);
					return contact;
				}),
		};
	}),
);
