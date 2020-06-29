// ==UserScript==
// @name         Show bulletin identifiers
// @namespace    dit-elections-degug-tools
// @version      1.0
// @description  Show identifiers of the bulletin, get rid of logging voting actions
// @author       Eugene Fedin
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
$('.bulletin__header').get(0).innerHTML += `<br>GUID: ${guid},
	<br>encryption public key: ${encryptionKey},
	<br>votingId: ${votingId}`;
let calculatedData = {};

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
		calculatedData[choice] = {
			signer: signer,
			encryptionKey: encryptionKey,
			rawStoreBallotTx: rawStoreBallotTx,
			rawTxHash: rawTxHash
		};

		$('.bulletin__header').get(0).innerHTML += `<br><br>Option ${choice}
			<br>Encrypted message: ${util.uint8ArrayToHexadecimal(encryptedBox.encryptedMessage)}
			<br>Nonce: ${util.uint8ArrayToHexadecimal(encryptedBox.nonce)}
			<br>Transaction address: ${rawTxHash}`;
	} catch(e) {
	}
});

let buttons = $('.bulletin__btn');
buttons.off();

buttons.on('click', function () {
	let $button = $(this);
	let choice = parseInt($button.data('value'));

	$(document).off('click.election');
	$button.prop('disabled', true).text('Отправка...');
    let $radios = $('.bulletin__radio');
	$radios.prop('disabled', true);

	$.ajax({
		url: window.location.origin + '/election/vote',
		type: 'post',
		dataType: 'json',
		data: ({
			rawStoreBallotTx: calculatedData[choice].rawStoreBallotTx,
			guid: guid,
			votingId: votingId,
			district: districtId,
			accountAddressBlock: calculatedData[choice].signer.getAccountAddress(),
			keyVerificationHash: window.ditVoting.Cryptor.getKeyVerificationHash(
				util.hexadecimalToUint8Array(calculatedData[choice].encryptionKey)
			),
			rawTxHash: calculatedData[choice].rawTxHash,
		}),
		success: function (data) {
			if (data.status === 'error') {
				redirectToUrl('/election/error/?code=' + data.code);
				return false;
			}
			redirectToUrl('/election/success');
			return true;
		},
		error: function (data) {
			return false;
		}
	});

	return true;
});
