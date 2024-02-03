import { useState } from "react";
import toast from "react-hot-toast";
import { useAuthContext } from "../context/AuthContext";

const userLogin = () => {
	const [loading, setLoading] = useState(false);
	const { setAuthUser } = useAuthContext();

	const login = async (email, password) => {
		const success = handleInputErrors(email, password);
		if (!success) return;
		setLoading(true);
		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();
			if (data.err) {
				throw new Error(data.err);
			}

			localStorage.setItem("chat-user", JSON.stringify(data));
			setAuthUser(data);
		} catch (err) {
			toast.error(err.message);
		} finally {
			setLoading(false);
		}
	};

	return { loading, login };
};
export default userLogin;

function handleInputErrors(email, password) {
	if (!email || !password) {
		toast.error("Please fill in all fields");
		return false;
	}

	return true;
}