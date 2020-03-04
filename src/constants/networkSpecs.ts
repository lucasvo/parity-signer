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

import colors from 'styles/colors';
import {
	EthereumNetworkParams,
	NetworkParams,
	NetworkProtocol,
	SubstrateNetworkParams,
	UnknownNetworkParams
} from 'types/networkSpecsTypes';

export const NetworkProtocols: {
	[key: string]: NetworkProtocol;
} = Object.freeze({
	ETHEREUM: 'ethereum',
	SUBSTRATE: 'substrate',
	UNKNOWN: 'unknown'
});

// accounts for which the network couldn't be found (failed migration, removed network)
export const UnknownNetworkKeys: {
	[key: string]: string;
} = Object.freeze({
	UNKNOWN: 'unknown'
});

// ethereumChainId is used as Network key for Ethereum networks
/* eslint-disable sort-keys */
export const EthereumNetworkKeys: {
	[key: string]: string;
} = Object.freeze({
	FRONTIER: '1',
	ROPSTEN: '3',
	RINKEBY: '4',
	GOERLI: '5',
	KOVAN: '42',
	CLASSIC: '61'
});

/* eslint-enable sort-keys */

// genesisHash is used as Network key for Substrate networks
export const SubstrateNetworkKeys: {
	[key: string]: string;
} = Object.freeze({
	KUSAMA: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe', // https://polkascan.io/pre/kusama-cc3/block/0
	KUSAMA_CC2:
		'0xe3777fa922cafbff200cadeaea1a76bd7898ad5b89f7848999058b50e715f636',
	KUSAMA_DEV:
		'0x5e9679182f658e148f33d3f760f11179977398bb3da8d1f0bf7b267fe6b3ebb0',
	CENTRIFUGE: '0x0000000000000000000000000000000000000000000000000000000000000001', // Needs to be replaced after mainnet genesis hash is finalized
	CENTRIFUGE_AMBER: '0x14ad1761c377ea2aac9a1f7edc648c8b7b64f2f7a1667330f4b5eeec65ab8a3f', // https://polkascan.io/pre/centrifuge-amber/block/0
	SUBSTRATE_DEV:
		'0x0d667fd278ec412cd9fccdb066f09ed5b4cfd9c9afa9eb747213acb02b1e70bc' // substrate --dev commit ac6a2a783f0e1f4a814cf2add40275730cd41be1 hosted on wss://dev-node.substrate.dev .
});

const unknownNetworkBase: { [key: string]: UnknownNetworkParams } = {
	[UnknownNetworkKeys.UNKNOWN]: {
		color: colors.bg_alert,
		pathId: '',
		prefix: 2,
		protocol: NetworkProtocols.UNKNOWN,
		secondaryColor: colors.card_bgSolid,
		title: 'Custom network'
	}
};

const substrateNetworkBase: {
	[key: string]: Partial<SubstrateNetworkParams>;
} = {
	[SubstrateNetworkKeys.KUSAMA]: {
		color: '#e6007a',
		decimals: 12,
		genesisHash: SubstrateNetworkKeys.KUSAMA,
		logo: require('res/img/logos/kusama.png'),
		pathId: 'kusama',
		prefix: 2,
		title: 'Kusama',
		unit: 'KSM'
	},
	[SubstrateNetworkKeys.KUSAMA_CC2]: {
		color: '#e6007a',
		decimals: 12,
		genesisHash: SubstrateNetworkKeys.KUSAMA,
		logo: require('res/img/logos/kusama.png'),
		pathId: 'kusama_CC2',
		prefix: 2,
		title: 'Kusama',
		unit: 'KSM'
	},
	[SubstrateNetworkKeys.KUSAMA_DEV]: {
		color: '#A60037',
		decimals: 12,
		genesisHash: SubstrateNetworkKeys.KUSAMA_DEV,
		pathId: 'kusama_dev',
		prefix: 2,
		title: 'Kusama Development',
		unit: 'KSM'
	},
	[SubstrateNetworkKeys.SUBSTRATE_DEV]: {
		color: '#ff8c00',
		decimals: 12,
		genesisHash: SubstrateNetworkKeys.SUBSTRATE_DEV,
		pathId: 'substrate_dev',
		prefix: 42,
		title: 'Substrate Development',
		unit: 'UNIT'
	},
 	[SubstrateNetworkKeys.CENTRIFUGE_AMBER]: {
		color: '#fcc367',
		decimals: 18,
		genesisHash: SubstrateNetworkKeys.CENTRIFUGE_AMBER,
		pathId: 'centrifuge_amber',
		prefix: 42,
		title: 'Centrifuge Amber Testnet',
		unit: 'ARAD'
	},
 	[SubstrateNetworkKeys.CENTRIFUGE]: {
		color: '#fcc367',
		decimals: 18,
		genesisHash: SubstrateNetworkKeys.CENTRIFUGE_AMBER,
		pathId: 'centrifuge',
		prefix: 36,
		title: 'Centrifuge Mainnet',
		unit: 'RAD'
	}
	// [SubstrateNetworkKeys.POLKADOT]: {
	//   color: '#e6007a',
	//   decimals: 12,
	//   genesisHash: SubstrateNetworkKeys.POLKADOT,
	//   prefix: 0,
	//   title: 'Polkadot mainnet',
	//   unit: 'DOT'
	// }
};

const ethereumNetworkBase: { [key: string]: Partial<EthereumNetworkParams> } = {
	[EthereumNetworkKeys.FRONTIER]: {
		color: '#64A2F4',
		ethereumChainId: EthereumNetworkKeys.FRONTIER,
		secondaryColor: colors.card_bgSolid,
		title: 'Ethereum'
	},
	[EthereumNetworkKeys.CLASSIC]: {
		color: '#319C7C',
		ethereumChainId: EthereumNetworkKeys.CLASSIC,
		logo: require('res/img/logos/eth-classic.png'),
		secondaryColor: colors.card_bgSolid,
		title: 'Ethereum Classic'
	},
	[EthereumNetworkKeys.ROPSTEN]: {
		ethereumChainId: EthereumNetworkKeys.ROPSTEN,
		title: 'Ropsten Testnet'
	},
	[EthereumNetworkKeys.GOERLI]: {
		ethereumChainId: EthereumNetworkKeys.GOERLI,
		title: 'Görli Testnet'
	},
	[EthereumNetworkKeys.KOVAN]: {
		ethereumChainId: EthereumNetworkKeys.KOVAN,
		title: 'Kovan Testnet'
	}
};

const ethereumDefaultValues = {
	color: '#2968C7',
	logo: require('res/img/logos/eth.png'),
	protocol: NetworkProtocols.ETHEREUM,
	secondaryColor: colors.card_text
};

const substrateDefaultValues = {
	color: '#4C4646',
	logo: require('res/img/logos/substrate-dev.png'),
	protocol: NetworkProtocols.SUBSTRATE,
	secondaryColor: colors.card_bgSolid
};

function setDefault(
	networkBase: any,
	defaultProps: object
): { [key: string]: any } {
	return Object.keys(networkBase).reduce((acc, networkKey) => {
		return {
			...acc,
			[networkKey]: {
				...defaultProps,
				...networkBase[networkKey]
			}
		};
	}, {});
}

export const ETHEREUM_NETWORK_LIST: {
	[key: string]: EthereumNetworkParams;
} = Object.freeze(setDefault(ethereumNetworkBase, ethereumDefaultValues));
export const SUBSTRATE_NETWORK_LIST: {
	[key: string]: SubstrateNetworkParams;
} = Object.freeze(setDefault(substrateNetworkBase, substrateDefaultValues));
export const UNKNOWN_NETWORK: {
	[key: string]: UnknownNetworkParams;
} = Object.freeze(unknownNetworkBase);

export const NETWORK_LIST: { [key: string]: NetworkParams } = Object.freeze(
	Object.assign(
		{},
		SUBSTRATE_NETWORK_LIST,
		ETHEREUM_NETWORK_LIST,
		UNKNOWN_NETWORK
	)
);

export const defaultNetworkKey = SubstrateNetworkKeys.KUSAMA;
