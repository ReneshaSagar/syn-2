const fs = require('fs');
const file = 'c:/Users/acer/Desktop/synthetic/frontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const errorBoundaryCode = `
import React from 'react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white', overflow: 'auto' }}>
          <h2>Something went wrong in ReportDashboard.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
`;

// Insert after imports
if (!content.includes('class ErrorBoundary')) {
  content = content.replace(/import \{.*?\} from '\.\/services\/api';/, match => match + '\n' + errorBoundaryCode);

  // Wrap ReportDashboard
  content = content.replace(/<ReportDashboard[\s\S]*?onPivotComplete=\{.*?\}[\s\S]*?\/>/, match => '<ErrorBoundary>\n        ' + match + '\n      </ErrorBoundary>');

  fs.writeFileSync(file, content);
  console.log('Fixed App.tsx');
} else {
  console.log('ErrorBoundary already injected');
}
