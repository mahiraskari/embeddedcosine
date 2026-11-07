import { useNavigate } from "react-router-dom";
import LoginModal from "../components/LoginModal";

export default function LoginPage() {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
            <LoginModal
                onClose={() => navigate("/")}
                onSuccess={() => navigate("/datasets")}
            />
        </div>
    );
}
