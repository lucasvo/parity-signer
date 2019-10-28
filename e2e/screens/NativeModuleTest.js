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

import React, {useState} from 'react';
import {View} from 'react-native';
import {encryptWithSecureKeystore, decryptWithSecureKeystore} from "../../src/util/native";
import testIDs from "../testIDs";
import Button from "../../src/components/Button";

const testSeed = '0xf49cd2aa6bda43467abc6aa0a4f37c5b1378146855f80f491e5dd6d053fa4279';
const testPublicAddress = '0x5Cc5dc62be3c95C771C142C2e30358B398265de21111';

export default function NativeModuleTest() {

	const [testSucceed, setTestResult] = useState(false);

	const generateTestResult = (expectedResult, actualResult) => expectedResult === actualResult ? setTestResult(true) : setTestResult(false);

	const testECCryptoModule = async () => {
		const encryptedSeed = await encryptWithSecureKeystore(testSeed, testPublicAddress);
		const decryptedText = await decryptWithSecureKeystore(encryptedSeed, testPublicAddress);
		generateTestResult(testSeed, decryptedText)
	};

	const startTest = async () => {
		try {
			await testECCryptoModule();
		} catch (e) {
			console.log('error is', e);
			setTestResult(false)
		}
	};

	return <View testID={testIDs.NativeTestScreen.nativeTestView}>
		<Button title="Start Test" onPress={startTest} testID={testIDs.NativeTestScreen.startButton}/>
		{testSucceed && <View testID={testIDs.NativeTestScreen.succeedView}/>}
	</View>
}