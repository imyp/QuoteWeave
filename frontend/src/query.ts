const API_URL = "http://localhost:8000"

type CreateUserRequest = {
    username: string,
    email: string,
    password: string,
}

type UserIdResponse = {
    id: string,    
}

async function createUser(request: CreateUserRequest): Promise<UserIdResponse> {
    const response = await fetch(`${API_URL}/users/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    return response.json();
}

export { createUser };