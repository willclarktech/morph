import { assert, given, ref, scenario, then, when } from "@morphdsl/scenario";
import type { Todo, User } from "@todo-app/tasks-dsl";
import {
	completeTodo,
	createTodo,
	createUser,
	listTodos,
} from "@todo-app/tasks-dsl";

export const scenarios = [
	scenario("Create and complete a todo")
		.withActor("Taylor")
		.steps(
			given(
				createUser.call({
					email: "taylor@test.com",
					name: "Taylor",
					password: "password123",
				}),
			).as("user"),
			when(
				createTodo.call({ userId: ref<User>("user").id, title: "Buy milk" }),
			).as("todo"),
			when(completeTodo.call({ todoId: ref<Todo>("todo").id })).as(
				"completedTodo",
			),
			then(
				assert("completedTodo", "completed")
					.toBe(true)
					.withProse("the todo is marked as completed"),
			),
		),

	scenario("List todos for a user")
		.withActor("Alex")
		.steps(
			given(
				createUser.call({
					email: "alex@test.com",
					name: "Alex",
					password: "password123",
				}),
			).as("user"),
			when(createTodo.call({ userId: ref<User>("user").id, title: "Task 1" })).as(
				"todo1",
			),
			when(createTodo.call({ userId: ref<User>("user").id, title: "Task 2" })).as(
				"todo2",
			),
			when(
				listTodos.call({ userId: ref<User>("user").id, includeCompleted: false }),
			).as("todos"),
			then(assert("todos").toHaveLength(2).withProse("two todos are returned")),
		),
];
