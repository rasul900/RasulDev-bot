import { Fragment } from "fragment-tg";
import { TonClient, WalletContractV4, internal, external, storeMessage } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { Cell, beginCell, SendMode } from "@ton/core";

let fragmentClient = null;
let tonWallet = null;
let tonClient = null;
let initError = null;

const readCookies = () => ({
  stel_dt: process.env.FRAGMENT_STEL_DT || "-240",
  stel_ssid: process.env.FRAGMENT_STEL_SSID || "",
  stel_token: process.env.FRAGMENT_STEL_TOKEN || "",
  stel_ton_token: process.env.FRAGMENT_STEL_TON_TOKEN || "",
});

const hasFragmentCredentials = () => {
  const c = readCookies();
  return Boolean(c.stel_ssid && c.stel_token && c.stel_ton_token);
};

const hasWalletCredentials = () =>
  Boolean(process.env.TON_MNEMONIC && process.env.TON_MNEMONIC.trim().split(/\s+/).length >= 12);

export const isFragmentConfigured = () =>
  hasFragmentCredentials() && hasWalletCredentials();

const buildTonWallet = async () => {
  const mnemonic = process.env.TON_MNEMONIC.trim().split(/\s+/);
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });

  const endpoint =
    process.env.TON_ENDPOINT || "https://toncenter.com/api/v2/jsonRPC";
  const client = new TonClient({
    endpoint,
    apiKey: process.env.TON_API_KEY || undefined,
  });

  return { wallet, keyPair, client };
};

const buildTonConnectIdentity = ({ wallet, keyPair }) => {
  const walletStateInit = wallet.init
    ? beginCell()
        .storeRef(wallet.init.code)
        .storeRef(wallet.init.data)
        .endCell()
        .toBoc()
        .toString("base64")
    : "";

  return {
    account: JSON.stringify({
      address: wallet.address.toRawString(),
      chain: "-239",
      walletStateInit,
      publicKey: keyPair.publicKey.toString("hex"),
    }),
    device: JSON.stringify({
      platform: "linux",
      appName: "telegram-shop-bot",
      appVersion: "1.0.0",
      maxProtocolVersion: 2,
      features: [{ name: "SendTransaction", maxMessages: 4 }],
    }),
  };
};

export const initFragment = async () => {
  initError = null;

  if (!isFragmentConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    tonWallet = await buildTonWallet();
    tonClient = tonWallet.client;

    const tonconnect = buildTonConnectIdentity(tonWallet);

    fragmentClient = new Fragment({
      cookies: readCookies(),
      tonconnect,
    });

    await fragmentClient.init();
    return { ok: true };
  } catch (err) {
    initError = err.message;
    console.error("Fragment init xatosi:", err.message);
    return { ok: false, reason: "init_failed", error: err.message };
  }
};

const signAndBroadcast = async (transaction) => {
  const { wallet, keyPair, client } = tonWallet;
  const contract = client.open(wallet);
  const seqno = await contract.getSeqno();

  const messages = (transaction.messages || []).map((m) =>
    internal({
      to: m.address,
      value: BigInt(m.amount),
      body: m.payload ? Cell.fromBase64(m.payload) : undefined,
      bounce: true,
    })
  );

  const transfer = wallet.createTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages,
  });

  const extMessage = external({
    to: wallet.address,
    init: seqno === 0 ? wallet.init : undefined,
    body: transfer,
  });

  const extCell = beginCell().store(storeMessage(extMessage)).endCell();
  const boc = extCell.toBoc();

  await client.sendFile(boc);

  return boc.toString("base64");
};

const resolveConfirmMethod = (tx) =>
  tx.confirm_method || tx.confirmMethod || tx.confirm || null;

export const buyStarsViaFragment = async (username, quantity) => {
  if (!fragmentClient) {
    const res = await initFragment();
    if (!res.ok) return { ok: false, reason: res.reason, error: res.error };
  }

  try {
    const cleanUser = username.replace("@", "");
    const tx = await fragmentClient.buyStars(cleanUser, quantity, {
      showSender: false,
    });

    if (!tx?.transaction?.messages?.length) {
      return { ok: false, reason: "no_transaction" };
    }

    const boc = await signAndBroadcast(tx.transaction);

    const confirmMethod = resolveConfirmMethod(tx);
    if (confirmMethod) {
      await fragmentClient.confirmPayment(confirmMethod, { boc });
    }

    return { ok: true, reqId: tx.reqId, boc };
  } catch (err) {
    console.error("buyStarsViaFragment xatosi:", err.message);
    return { ok: false, reason: "failed", error: err.message };
  }
};

export const giftPremiumViaFragment = async (username, months) => {
  if (!fragmentClient) {
    const res = await initFragment();
    if (!res.ok) return { ok: false, reason: res.reason, error: res.error };
  }

  try {
    const cleanUser = username.replace("@", "");
    const tx = await fragmentClient.giftPremium(cleanUser, months, {
      showSender: false,
    });

    if (!tx?.transaction?.messages?.length) {
      return { ok: false, reason: "no_transaction" };
    }

    const boc = await signAndBroadcast(tx.transaction);

    const confirmMethod = resolveConfirmMethod(tx);
    if (confirmMethod) {
      await fragmentClient.confirmPayment(confirmMethod, { boc });
    }

    return { ok: true, reqId: tx.reqId, boc };
  } catch (err) {
    console.error("giftPremiumViaFragment xatosi:", err.message);
    return { ok: false, reason: "failed", error: err.message };
  }
};
