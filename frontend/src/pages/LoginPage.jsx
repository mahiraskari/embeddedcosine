import { useNavigate } from "react-router-dom";
import LoginModal from "../components/LoginModal";

export default function LoginPage() {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: "100vh", background: "#05050a" }}>
            <LoginModal
                onClose={() => navigate("/")}
                onSuccess={() => navigate("/projects")}
            />
        </div>
    );
}
