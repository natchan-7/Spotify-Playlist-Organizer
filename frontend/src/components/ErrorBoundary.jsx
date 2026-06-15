import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in app:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="page-shell">
        <div className="content-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">エラー</p>
                <h2>予期しないエラーが発生しました</h2>
              </div>
            </div>
            <div className="notice error">
              <p>
                画面の表示中に問題が発生しました。ページを再読み込みすると復旧する場合があります。
              </p>
            </div>
            <button type="button" className="primary-button" onClick={this.handleReload}>
              ページを再読み込み
            </button>
          </section>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
