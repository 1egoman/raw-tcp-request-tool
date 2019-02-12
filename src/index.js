import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import classnames from 'classnames';

import styles from './styles.module.css';

const READY = 'READY',
      LOADING = 'LOADING',
      ERROR = 'ERROR';

async function textAnimate(input, fn, splitChar='', timeBasis=5) {
  if (input.length === 0) {
    return Promise.resolve();
  } else {
    const timeInBetween = timeBasis + Math.floor(Math.random() * (timeBasis/2));
    let text = input;
    return new Promise(resolve => {
      setTimeout(() => {
        fn(text.split(splitChar)[0]+splitChar);
        textAnimate(
          text.split(splitChar).slice(1).join(splitChar),
          fn,
          splitChar,
          timeBasis,
        ).then(resolve);
      }, timeInBetween);
    });
  }
}

const timeout = (delayMs) => new Promise(resolve => setTimeout(resolve, delayMs));

class App extends Component {
  state = {
    view: ERROR,
    data: '',
    host: 'example.com',
    port: '80',
    results: '',
    error: null,
    highlight: null,
  }

  makeRequest = async () => {
    const host = this.state.host;
    const data = this.state.data;
    const port = parseInt(this.state.port, 10);

    this.setState({results: ''});

    if (host.length === 0) {
      this.setState({
        view: ERROR,
        error: 'Please enter a hostname or ip address to send to!',
        highlight: 'host',
      });
      return
    }

    if (port.length === 0) {
      this.setState({
        view: ERROR,
        error: 'Please enter a port to send your data along!',
        highlight: 'port',
      });
      return
    }

    if (isNaN(port)) {
      this.setState({
        view: ERROR,
        error: 'Port is non-numeric.',
        highlight: 'port',
      });
      return;
    }

    if (port <= 0) {
      this.setState({
        view: ERROR,
        error: 'Port must be greater than zero.',
        highlight: 'port',
      });
      return;
    }

    if (port > 63335) {
      this.setState({
        view: ERROR,
        error: 'Port is greater than 65535, it must be less than 65535.',
        highlight: 'port',
      });
      return;
    }

    if (data.length === 0) {
      this.setState({
        view: ERROR,
        error: 'Please enter some data to send!',
        highlight: 'data',
      });
      return
    }


    this.setState({view: LOADING, highlight: null, error: null});

    await textAnimate(
      `Creating TCP connection to ${host}:${port}...\n`,
      c => this.setState(state => ({results: state.results + c})),
    );

    await timeout(500);

    await textAnimate(
      data,
      c => this.setState(state => ({results: state.results + '> ' + c})),
      '\n',
      20,
    );

    const response = await fetch('https://request-handler-oczqdurgbt.now.sh/request/tcp', {
      method: 'POST',
      body: JSON.stringify({
        host: this.state.host,
        port,
        data: this.state.data,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const results = await response.text();

      await textAnimate(
        results,
        c => this.setState(state => ({results: state.results + '< ' + c})),
        '\n',
        20,
      );

      this.setState({ view: READY });
    } else {
      this.setState({
        view: ERROR,
        error: `Error: ${(await response.json()).error} (${response.status})`,
      });
    }
  }

  getPortType = () => {
    switch (this.state.port) {
    case '80': return 'HTTP';
    case '443': return 'HTTPS';
    case '22': return 'SSH';
    case '21': return 'Telnet';
    case '53': return 'DNS';
    case '25': return 'SMTP';
    default: return '';
    }
  }

  render() {
    const { highlight, view } = this.state;
    return (
      <div className={styles.container}>
        <div className={styles.leftPane}>
          <div className={styles.hostPortGroup}>
            <label for="#host">Host:</label>
            <input
              type="text"
              id="host"
              placeholder="Host"
              value={this.state.host}
              onChange={e => this.setState({host: e.target.value})}
              className={highlight === 'host' ? styles.highlight : null}
            />
            <label for="#port">Port:</label>
            <input
              type="text"
              id="port"
              placeholder="Port"
              value={this.state.port}
              onChange={e => this.setState({port: e.target.value})}
              className={highlight === 'port' ? styles.highlight : null}
            />
            <span className={styles.portType}>{this.getPortType()}</span>
          </div>
          <textarea
            value={this.state.data}
            onChange={e => this.setState({data: e.target.value})}
            className={highlight === 'data' ? styles.highlight : null}
          />
          <button className={styles.button} onClick={this.makeRequest}>Make request</button>
        </div>
        <div className={styles.rightPane}>
          <div className={classnames(styles.results, {[styles.notIdealState]: view === ERROR})}>
            {view === ERROR ? (
              <span className={styles.error}>{this.state.error}</span>
            ) : (
              <pre>{this.state.results}</pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('root'));

/*
 * - ports
 * - http vs https
 *
 *
 */
