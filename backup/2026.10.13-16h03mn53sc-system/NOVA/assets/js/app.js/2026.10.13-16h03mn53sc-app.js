/**
 * ASTROCROWN & NOVA TELEMETRY CLIENT LOGIC
 * Zero-Tracking | Non-Custodial Sovereign Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect-wallet-btn');

    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const account = accounts[0];
                    const truncated = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
                    connectBtn.textContent = truncated;
                    connectBtn.style.backgroundColor = '#22c55e';
                } catch (error) {
                    console.error('Wallet connection rejected:', error);
                }
            } else {
                alert('No Web3 Provider detected. Please install MetaMask or Rabby Wallet.');
            }
        });
    }
});