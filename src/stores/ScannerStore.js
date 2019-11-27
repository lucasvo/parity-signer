// Copyright 2015-2019 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

// @flow
import { GenericExtrinsicPayload } from '@polkadot/types';

import {
	hexStripPrefix,
	hexToU8a,
	isU8a,
	u8aToHex,
	u8aConcat
} from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { Container } from 'unstated';

import {
	NETWORK_LIST,
	NetworkProtocols,
	SUBSTRATE_NETWORK_LIST,
	APP_ID
} from '../constants';

import { isAscii } from '../util/strings';
import {
	brainWalletSign,
	decryptData,
	keccak,
	ethSign,
	substrateSign,
	secureEthkeySign,
	secureSubstrateSign
} from '../util/native';
import { mod } from '../util/numbers';
import transaction from '../util/transaction';
import {
	constructDataFromBytes,
	asciiToHex,
	encodeNumber
} from '../util/decoders';
import { Account } from './types';
import { constructSURI } from '../util/suri';
import { emptyAccount } from '../util/account';

type TXRequest = Object;

type SignedTX = {
	recipient: Account,
	sender: Account,
	txRequest: TXRequest
};

type MultipartData = {
	[x: string]: Uint8Array
};

type ScannerState = {
	completedFramesCount: number,
	dataToSign: string,
	isHash: boolean,
	isOversized: boolean,
	latestFrame: number,
	message: string,
	missedFrames: Array<number>,
	multipartData: MultipartData,
	multipartComplete: boolean,
	prehash: GenericExtrinsicPayload,
	recipient: Account,
	scanErrorMsg: string,
	sender: Account,
	signedData: string,
	signedTxList: [SignedTX],
	totalFrameCount: number,
	tx: Object,
	txRequest: TXRequest | null,
	type: 'transaction' | 'message',
	unsignedData: Object
};

const DEFAULT_STATE = Object.freeze({
	busy: false,
	completedFramesCount: 0,
	dataToSign: '',
	isHash: false,
	isOversized: false,
	latestFrame: null,
	message: null,
	missedFrames: [],
	multipartComplete: false,
	multipartData: {},
	prehash: null,
	recipient: null,
	scanErrorMsg: '',
	sender: null,
	signedData: '',
	totalFrameCount: 0,
	tx: '',
	txRequest: null,
	type: null,
	unsignedData: null
});

const MULTIPART = new Uint8Array([0]); // always mark as multipart for simplicity's sake. Consistent with @polkadot/react-qr

// const SIG_TYPE_NONE = new Uint8Array();
// const SIG_TYPE_ED25519 = new Uint8Array([0]);
const SIG_TYPE_SR25519 = new Uint8Array([1]);
// const SIG_TYPE_ECDSA = new Uint8Array([2]);

export default class ScannerStore extends Container<ScannerState> {
	state = DEFAULT_STATE;

	async setUnsigned(data) {
		this.setState({
			unsignedData: JSON.parse(data)
		});
	}

	/*
	 * @param strippedData: the rawBytes from react-native-camera, stripped of the ec11 padding to fill the frame size. See: decoders.js
	 * N.B. Substrate oversized/multipart payloads will already be hashed at this point.
	 */

	async setParsedData(strippedData, accountsStore, multipartComplete = false) {
		const parsedData = await constructDataFromBytes(
			strippedData,
			multipartComplete
		);

		if (!multipartComplete && parsedData.isMultipart) {
			this.setPartData(
				parsedData.currentFrame,
				parsedData.frameCount,
				parsedData.partData,
				accountsStore
			);
			return;
		}

		if (await accountsStore.getAccountByAddress(parsedData.data.account)) {
			this.setState({
				unsignedData: parsedData
			});
		} else {
			// If the address is not found on device in its current encoding,
			// try decoding the public key and encoding it to all the other known network prefixes.
			let networks = Object.keys(SUBSTRATE_NETWORK_LIST);

			for (let i = 0; i < networks.length; i++) {
				let key = networks[i];
				let account = await accountsStore.getAccountByAddress(
					encodeAddress(
						decodeAddress(parsedData.data.account),
						SUBSTRATE_NETWORK_LIST[key].prefix
					)
				);

				if (account) {
					parsedData.data.account = account.address;

					this.setState({
						unsignedData: parsedData
					});
					return;
				}
			}

			// if the account was not found, unsignedData was never set, alert the user appropriately.
			this.setErrorMsg(
				`No private key found for ${parsedData.data.account} in your signer key storage.`
			);
		}

		// set payload before it got hashed.
		// signature will be generated from the hash, but we still want to display it.
		this.setPrehashPayload(parsedData.preHash);
	}

	async setPartData(frame, frameCount, partData, accountsStore) {
		const {
			latestFrame,
			missedFrames,
			multipartComplete,
			multipartData,
			totalFrameCount
		} = this.state;

		// set it once only
		if (!totalFrameCount) {
			this.setState({
				totalFrameCount: frameCount
			});
		}

		const partDataAsBytes = new Uint8Array(partData.length / 2);

		for (let i = 0; i < partDataAsBytes.length; i++) {
			partDataAsBytes[i] = parseInt(partData.substr(i * 2, 2), 16);
		}

		if (
			partDataAsBytes[0] === new Uint8Array([0x00]) ||
			partDataAsBytes[0] === new Uint8Array([0x7b])
		) {
			// part_data for frame 0 MUST NOT begin with byte 00 or byte 7B.
			throw new Error('Error decoding invalid part data.');
		}

		const completedFramesCount = Object.keys(multipartData).length;

		if (
			completedFramesCount > 0 &&
			totalFrameCount > 0 &&
			completedFramesCount === totalFrameCount &&
			!multipartComplete
		) {
			// all the frames are filled

			this.setState({
				multipartComplete: true
			});

			// concatenate all the parts into one binary blob
			let concatMultipartData = Object.values(multipartData).reduce(
				(acc, part) => [...acc, ...part]
			);

			// unshift the frame info
			const frameInfo = u8aConcat(
				MULTIPART,
				encodeNumber(totalFrameCount),
				encodeNumber(frame)
			);
			concatMultipartData = u8aConcat(frameInfo, concatMultipartData);

			// handle the binary blob as a single UOS payload
			this.setParsedData(concatMultipartData, accountsStore, true);
		} else if (completedFramesCount < totalFrameCount) {
			// we haven't filled all the frames yet
			const nextDataState = multipartData;
			nextDataState[frame] = partDataAsBytes;

			const missedFramesRange = mod(frame - latestFrame, totalFrameCount) - 1;

			// we skipped at least one frame that we haven't already scanned before
			if (
				latestFrame &&
				missedFramesRange >= 1 &&
				!missedFrames.includes(frame)
			) {
				// enumerate all the frames between (current)frame and latestFrame
				const updatedMissedFrames = Array.from(
					new Array(missedFramesRange),
					(_, i) => mod(i + latestFrame, totalFrameCount)
				);

				const dedupMissedFrames = new Set([
					...this.state.missedFrames,
					...updatedMissedFrames
				]);

				this.setState({
					missedFrames: Array.from(dedupMissedFrames)
				});
			}

			// if we just filled a frame that was previously missed, remove it from the missedFrames list
			if (missedFrames && missedFrames.includes(frame - 1)) {
				missedFrames.splice(missedFrames.indexOf(frame - 1), 1);
			}

			this.setState({
				latestFrame: frame,
				multipartData: nextDataState
			});
		}

		this.setState({
			completedFramesCount
		});
	}

	async setData(accountsStore) {
		switch (this.state.unsignedData.action) {
			case 'signTransaction':
				return await this.setTXRequest(this.state.unsignedData, accountsStore);
			case 'signData':
				return await this.setDataToSign(this.state.unsignedData, accountsStore);
			default:
				throw new Error(
					'Scanned QR should contain either transaction or a message to sign'
				);
		}
	}

	async setDataToSign(signRequest, accountsStore) {
		this.setBusy();

		const address = signRequest.data.account;
		const crypto = signRequest.data.crypto;
		const message = signRequest.data.data;
		const isHash = signRequest.isHash;
		const isOversized = signRequest.oversized;

		let dataToSign = '';

		if (crypto === 'sr25519' || crypto === 'ed25519') {
			// only Substrate payload has crypto field
			dataToSign = message;
		} else {
			dataToSign = await ethSign(message);
		}

		const sender = await accountsStore.getAccountByAddress(address);

		if (!sender) {
			throw new Error(
				`No private key found for ${address} in your signer key storage.`
			);
		}

		this.setState({
			dataToSign,
			isHash,
			isOversized,
			message,
			sender,
			type: 'message'
		});

		return true;
	}

	async setTXRequest(txRequest, accountsStore) {
		this.setBusy();

		const isOversized = txRequest.oversized;

		const protocol = txRequest.data.rlp
			? NetworkProtocols.ETHEREUM
			: NetworkProtocols.SUBSTRATE;
		const isEthereum = protocol === NetworkProtocols.ETHEREUM;

		if (
			isEthereum &&
			!(txRequest.data && txRequest.data.rlp && txRequest.data.account)
		) {
			throw new Error('Scanned QR contains no valid transaction');
		}

		const tx = isEthereum
			? await transaction(txRequest.data.rlp)
			: txRequest.data.data;

		const networkKey = isEthereum
			? tx.ethereumChainId
			: txRequest.data.data.genesisHash.toHex();

		const sender = await accountsStore.getById({
			address: txRequest.data.account,
			networkKey
		});

		const networkTitle = NETWORK_LIST[networkKey].title;

		if (!sender) {
			throw new Error(
				`No private key found for account ${txRequest.data.account} found in your signer key storage for the ${networkTitle} chain.`
			);
		}

		const recipientAddress = isEthereum ? tx.action : txRequest.data.account;

		let recipient =
			(await accountsStore.getById({
				address: recipientAddress,
				networkKey
			})) || emptyAccount(emptyAccount(recipientAddress, networkKey));

		// For Eth, always sign the keccak hash.
		// For Substrate, only sign the blake2 hash if payload bytes length > 256 bytes (handled in decoder.js).
		const dataToSign = isEthereum
			? await keccak(txRequest.data.rlp)
			: txRequest.data.data;

		this.setState({
			dataToSign,
			isOversized,
			recipient,
			sender,
			tx,
			txRequest,
			type: 'transaction'
		});

		return true;
	}

	async signDataBiometric(legacy = false) {
		const { dataToSign, isHash, sender } = this.state;

		const isEthereum =
			NETWORK_LIST[sender.networkKey].protocol === NetworkProtocols.ETHEREUM;

		let signable;
		if (isEthereum) {
			signable = dataToSign;
		} else {
			if (dataToSign instanceof GenericExtrinsicPayload) {
				signable = u8aToHex(dataToSign.toU8a(true), -1, false);
			} else if (isHash) {
				signable = hexStripPrefix(dataToSign);
			} else if (isU8a(dataToSign)) {
				signable = hexStripPrefix(u8aToHex(dataToSign));
			} else if (isAscii(dataToSign)) {
				signable = hexStripPrefix(asciiToHex(dataToSign));
			}
		}

		let signedData;
		try {
			if (isEthereum) {
				signedData = await secureEthkeySign(
					APP_ID,
					sender.pinKey,
					signable,
					sender.encryptedSeed
				);
			} else {
				signedData = await secureSubstrateSign(
					APP_ID,
					sender.pinKey,
					signable,
					sender.encryptedSeed,
					legacy
				);
			}

			if (!isEthereum) {
				// TODO: tweak the first byte if and when sig type is not sr25519
				const sig = u8aConcat(SIG_TYPE_SR25519, hexToU8a('0x' + signedData));
				signedData = u8aToHex(sig, -1, false); // the false doesn't add 0x
			}

			this.setState({ signedData });
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	async signDataWithSuri(suri) {
		const { dataToSign, isHash, sender } = this.state;

		const isEthereum =
			NETWORK_LIST[sender.networkKey].protocol === NetworkProtocols.ETHEREUM;

		let signedData;
		if (isEthereum) {
			signedData = await brainWalletSign(suri, dataToSign);
		} else {
			let signable;
			if (dataToSign instanceof GenericExtrinsicPayload) {
				signable = u8aToHex(dataToSign.toU8a(true), -1, false);
			} else if (isHash) {
				signable = hexStripPrefix(dataToSign);
			} else if (isU8a(dataToSign)) {
				signable = hexStripPrefix(u8aToHex(dataToSign));
			} else if (isAscii(dataToSign)) {
				signable = hexStripPrefix(asciiToHex(dataToSign));
			}
			let signed = await substrateSign(suri, signable);
			signed = '0x' + signed;
			// TODO: tweak the first byte if and when sig type is not sr25519
			const sig = u8aConcat(SIG_TYPE_SR25519, hexToU8a(signed));
			signedData = u8aToHex(sig, -1, false); // the false doesn't add 0x
		}
		this.setState({ signedData });
	}

	async signDataWithSeed(seed, protocol) {
		if (protocol === NetworkProtocols.SUBSTRATE) {
			const suri = constructSURI({
				derivePath: this.state.sender.path,
				password: '',
				phrase: seed
			});
			await this.signDataWithSuri(suri);
		} else {
			await this.signDataWithSuri(seed);
		}
	}

	async signDataLegacy(pin = '1') {
		const { sender } = this.state;
		const suri = await decryptData(sender.encryptedSeed, pin);
		await this.signDataWithSuri(suri);
	}

	cleanup() {
		return new Promise(resolve => {
			this.setState(
				{
					...DEFAULT_STATE
				},
				resolve
			);
			this.clearMultipartProgress();
		});
	}

	clearMultipartProgress() {
		this.setState({
			completedFramesCount: DEFAULT_STATE.completedFramesCount,
			latestFrame: DEFAULT_STATE.latestFrame,
			missedFrames: DEFAULT_STATE.missedFrames,
			multipartComplete: DEFAULT_STATE.multipartComplete,
			multipartData: {},
			totalFrameCount: DEFAULT_STATE.totalFrameCount,
			unsignedData: DEFAULT_STATE.unsignedData
		});
	}

	/**
	 * @dev signing payload type can be either transaction or message
	 */
	getType() {
		return this.state.type;
	}

	/**
	 * @dev sets a lock on writes
	 */
	setBusy() {
		this.setState({
			busy: true
		});
	}

	/**
	 * @dev allow write operations
	 */
	setReady() {
		this.setState({
			busy: false
		});
	}

	isBusy() {
		return this.state.busy;
	}

	isMultipartComplete() {
		return this.state.multipartComplete;
	}

	/**
	 * @dev is the payload a hash
	 */
	getIsHash() {
		return this.state.isHash;
	}

	/**
	 * @dev is the payload size greater than 256 (in Substrate chains)
	 */
	getIsOversized() {
		return this.state.isOversized;
	}

	/**
	 * @dev returns the number of completed frames so far
	 */
	getCompletedFramesCount() {
		return this.state.completedFramesCount;
	}

	/**
	 * @dev returns the number of frames to fill in total
	 */
	getTotalFramesCount() {
		return this.state.totalFrameCount;
	}

	getSender() {
		return this.state.sender;
	}

	getRecipient() {
		return this.state.recipient;
	}

	getTXRequest() {
		return this.state.txRequest;
	}

	getMessage() {
		return this.state.message;
	}

	/**
	 * @dev unsigned data, not yet formatted as signable payload
	 */
	getUnsigned() {
		return this.state.unsignedData;
	}

	getTx() {
		return this.state.tx;
	}

	/**
	 * @dev unsigned date, formatted as signable payload
	 */
	getDataToSign() {
		return this.state.dataToSign;
	}

	getSignedTxData() {
		return this.state.signedData;
	}

	setErrorMsg(scanErrorMsg) {
		this.setState({ scanErrorMsg });
	}

	getErrorMsg() {
		return this.state.scanErrorMsg;
	}

	getMissedFrames() {
		return this.state.missedFrames;
	}

	getPrehashPayload() {
		return this.state.prehash;
	}

	setPrehashPayload(prehash) {
		this.setState({
			prehash
		});
	}
}
