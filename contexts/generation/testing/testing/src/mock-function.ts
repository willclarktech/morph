export interface MockFunction<TArguments extends readonly unknown[], TReturn> {
	(...arguments_: TArguments): TReturn;
	readonly calls: TArguments[];
	readonly lastCall: TArguments | undefined;
	mockReturnValue: (value: TReturn) => void;
	mockImplementation: (
		function_: (...arguments_: TArguments) => TReturn,
	) => void;
	reset: () => void;
}

export const createMockFunction = <
	TArguments extends readonly unknown[],
	TReturn,
>(): MockFunction<TArguments, TReturn> => {
	const calls: TArguments[] = [];
	let returnValue: TReturn | undefined;
	let implementation: ((...arguments_: TArguments) => TReturn) | undefined;

	const mockFunction_ = ((...arguments_: TArguments): TReturn => {
		calls.push(arguments_);
		if (implementation) {
			return implementation(...arguments_);
		}
		return returnValue as TReturn;
	}) as MockFunction<TArguments, TReturn>;

	Object.defineProperty(mockFunction_, "calls", {
		get: () => [...calls],
	});

	Object.defineProperty(mockFunction_, "lastCall", {
		get: () => calls.at(-1),
	});

	mockFunction_.mockReturnValue = (value: TReturn) => {
		returnValue = value;
	};

	mockFunction_.mockImplementation = (
		function_: (...arguments_: TArguments) => TReturn,
	) => {
		implementation = function_;
	};

	mockFunction_.reset = () => {
		calls.length = 0;
		returnValue = undefined;
		implementation = undefined;
	};

	return mockFunction_;
};
