import type { Effect } from "effect";

import { Context, Effect as E, Layer } from "effect";

export interface TemplateSchemaHandler {
	readonly handle: (
		params: Record<string, never>,
		options: Record<string, never>,
	) => Effect.Effect<string, never>;
}

export const TemplateSchemaHandler = Context.GenericTag<TemplateSchemaHandler>(
	"@morph/impls/TemplateSchemaHandler",
);

const TEMPLATE = `\
domain MyApp

extensions {
	storage [memory, sqlite, redis] default memory
	eventStore [memory] default memory
}

context Catalog "Product catalog bounded context" {

	@root
	entity Product {
		id: string
		@unique
		name: string
		slug: string
		description: string?
		price: float
		quantity: integer
		sku: string
		active: boolean
		category: "electronics" | "clothing" | "food"
		dueDate?: date
		createdAt: datetime
		belongs_to Category "Product category"
	}

	entity Category {
		id: string
		name: string
	}

	value Money "Monetary amount" {
		amount: float
		currency: string
	}

	@context
	invariant HasName
		"Product must have a name"
		violation "Name is required"
		where name != ""

	@aggregate
	invariant PositivePrice on Product
		"Price must be positive when product is active"
		violation "Price must be greater than zero"
		where active == false || price > 0

	command CreateProduct "Create a new product in the catalog"
		reads Product, writes Product
		pre HasName
		input {
			name: string
			price: float
			@sensitive
			sku: string
		}
		output Product
		emits ProductCreated "Emitted when a product is created"
		errors {
			DuplicateSku "A product with this SKU already exists" when "sku is taken"
		}

	command UpdatePrice "Update the price of an existing product"
		reads Product, writes Product
		input {
			id: string
			newPrice: float
		}
		output Product
		emits PriceChanged "Emitted when a product price changes"
		errors {
			ProductNotFound "No product found with the given ID" when "id does not exist"
		}

	query GetProduct "Retrieve a product by ID"
		reads Product
		input {
			id: string
		}
		output Product?
		errors {
			ProductNotFound "No product found with the given ID" when "id does not exist"
		}

	query ListProducts "List all products, optionally filtered by category"
		reads Product
		input {
			category: string?
		}
		output Product[]

	function ValidateSku "Check whether a SKU format is valid"
		input {
			sku: string
		}
		output boolean

	subscriber OnProductCreated "Handle product creation side effects"
		on ProductCreated
}
`;

export const TemplateSchemaHandlerLive = Layer.succeed(TemplateSchemaHandler, {
	handle: () => E.succeed(TEMPLATE),
});
