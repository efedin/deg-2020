// ==UserScript==
// @name         Show bulletin identifiers
// @namespace    Eugene Fedin
// @version      0.1
// @description  Show identifiers of the bulletin
// @author       Eugene
// @include      http://elec.moscow/*
// @include      https://elec.moscow/*
// @run-at       document-end
// ==/UserScript==

let districtId = parseInt($('#district').val());
let votingId = unsafeWindow.ditVotingParams.voitingId;
let choices = $('.bulletin__radio');

let encryptionKey = unsafeWindow.ditVotingParams.publicKey;
let util = unsafeWindow.ditVoting.util;
let encryptor = unsafeWindow.ditVoting.Cryptor.withRandomKeyPair();
let guid = $('#guid').val();
$('.bulletin__header').get(0).innerHTML += `<br>GUID: ${guid}`;

choices.each(function() {
	try {
		let choice = $(this).attr('value');
		let encryptedBox = encryptor.encrypt(
			util.numberToLeBytes(choice),
			util.hexadecimalToUint8Array(encryptionKey)
		);

		let signer = new unsafeWindow.ditVoting.TransactionSigner();
		let rawStoreBallotTx = signer.getSignedTransaction(
			votingId,
			districtId,
			util.uint8ArrayToHexadecimal(encryptedBox.encryptedMessage),
			util.uint8ArrayToHexadecimal(encryptedBox.nonce),
			util.uint8ArrayToHexadecimal(encryptedBox.publicKey)
			);

		let rawTxHash = signer.getRawTransactionHash(rawStoreBallotTx);

		$('.bulletin__header').get(0).innerHTML += `<br><br>Option ${choice}
			<br>Encrypted message: ${util.uint8ArrayToHexadecimal(encryptedBox.encryptedMessage)}
			<br>Nonce: ${util.uint8ArrayToHexadecimal(encryptedBox.nonce)}
			<br>Encryption public key: ${encryptionKey}
			<br>Transaction address: ${rawStoreBallotTx}`;
	} catch(e) {
	}
});
