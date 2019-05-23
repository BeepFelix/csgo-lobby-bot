const ByteBuffer = require("bytebuffer");

const Type = {
	None: 0,
	String: 1,
	Int32: 2,
	Float32: 3,
	Pointer: 4,
	WideString: 5,
	Color: 6,
	UInt64: 7,
	End: 8,
};

module.exports = class VDF {
	static decode(buffer, customParseFields = {}) {
		if (buffer.toString("hex").startsWith("0000") === true) {
			buffer = Buffer.from(buffer.toString("hex").substring(4), "hex");
		}

		let object = {};
		if (typeof buffer.readUint8 !== "function") {
			buffer = ByteBuffer.wrap(buffer);
		}

		if (buffer.offset !== buffer.limit) {
			while (true) {
				let type = buffer.readUint8();

				if (type === Type.End) {
					break;
				}

				let name = buffer.readCString();

				if (customParseFields[name] !== undefined) {
					object[name] = customParseFields[name](buffer);
					continue;
				}

				switch (type) {
					case Type.None: {
						object[name] = this.decode(buffer);
						break;
					}
					case Type.String: {
						object[name] = buffer.readCString();
						break;
					}
					case Type.Int32:
					case Type.Color:
					case Type.Pointer: {
						object[name] = buffer.readInt32();
						break;
					}
					case Type.UInt64: {
						object[name] = buffer.readUint64();
						break;
					}
					case Type.Float32: {
						object[name] = buffer.readFloat();
						break;
					}
				}
			}
		}

		return object;
	}

	static encode(object, prefix = [0x00, 0x00]) {
		let buffer = new ByteBuffer();

		for (let pre of prefix) {
			buffer.writeByte(pre);
		}

		for (let item in object) {
			if (object.hasOwnProperty(item) === true) {
				_encode(object[item], buffer, item);
			}
		}

		buffer.writeByte(Type.End);
		buffer.flip();

		return buffer;
	}
}

function _encode(object, buffer, name) {
	switch (typeof object) {
		case "object": {
			buffer.writeByte(Type.None);
			buffer.writeCString(name);

			for (let index in object) {
				_encode(object[index], buffer, index);
			}

			buffer.writeByte(Type.End);
			break;
		}
		case "string": {
			buffer.writeByte(Type.String);
			buffer.writeCString(name);
			buffer.writeCString(object ? object : null);
			break;
		}
		case "number": {
			buffer.writeByte(Type.String);
			buffer.writeCString(name);
			buffer.writeCString(object.toString());
			break;
		}
	}
}
