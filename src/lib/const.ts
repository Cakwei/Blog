export const CATEGORIES = [
	"Technology",
	"Design",
	"Engineering",
	"Product",
	"Medical",
	"Culture",
];

export const MESSAGE = {
	FETCH_SUCCESS: "Successfully fetched data",
	UNAUTHORIZED_ACCESS:
		"Unthorized access, please login before reaching this endpoint",
	SERVER_ERROR:
		"An error has occurred server side, please try again in a moment",
};

export const API_URL =
	process.env.NODE_ENV === "production"
		? process.env.BETTER_AUTH_URL
		: "http://localhost:3000";
