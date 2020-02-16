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

import React from 'react';
import { Subscribe } from 'unstated';
import AccountsStore from '../stores/AccountsStore';
import ScannerStore from '../stores/ScannerStore';

interface AccountInjectedProps {
	accounts: AccountsStore;
}

interface ScannerInjectedProps {
	scanner: ScannerStore;
}

type AccountAndScannerInjectedProps = AccountInjectedProps &
	ScannerInjectedProps;

export function withAccountStore<T extends AccountInjectedProps>(
	WrappedComponent: React.ComponentType<any>
): React.ComponentType<Omit<T, keyof AccountInjectedProps>> {
	return props => (
		<Subscribe to={[AccountsStore]}>
			{(accounts: AccountsStore): React.ReactElement => (
				<WrappedComponent accounts={accounts} {...props} />
			)}
		</Subscribe>
	);
}

export function withScannerStore<T extends ScannerInjectedProps>(
	WrappedComponent: React.ComponentType<any>
): React.ComponentType<Omit<T, keyof AccountInjectedProps>> {
	return props => (
		<Subscribe to={[ScannerStore]}>
			{scanner => <WrappedComponent {...props} scanner={scanner} />}
		</Subscribe>
	);
}

export function withAccountAndScannerStore<
	T extends AccountAndScannerInjectedProps
>(
	WrappedComponent: React.ComponentType<any>
): React.ComponentType<Omit<T, keyof AccountAndScannerInjectedProps>> {
	return props => (
		<Subscribe to={[ScannerStore, AccountsStore]}>
			{(scanner, accounts) => (
				<WrappedComponent {...props} scanner={scanner} accounts={accounts} />
			)}
		</Subscribe>
	);
}
