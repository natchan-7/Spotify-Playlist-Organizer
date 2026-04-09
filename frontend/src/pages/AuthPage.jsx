import AuthStatusCard from "../components/AuthStatusCard";

function AuthPage(props) {
  return (
    <main className="page-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />
      <AuthStatusCard {...props} />
    </main>
  );
}

export default AuthPage;
