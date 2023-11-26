import {promises as fs} from "fs";
import {toU16, toU32, toU64, toDouble} from "./numberUtil.js"
type FileHandle = fs.FileHandle;


export class Time{
    days: number;
    ms: number;
    us: number;
    epoch: number;
    time: Date;
    constructor(
        b1: number,
        b2: number,
        b3: number,
        b4: number,
        b5: number,
        b6: number,
        b7: number,
        b8: number
    ){
        this.days = toU16(b1, b2);
        this.ms = toU32(b3,b4,b5,b6);
        this.us = toU16(b7,b8);
        this.epoch = new Date("01-01-2000").getTime() + this.days*24*60*60*1000 + this.ms
        this.time = new Date(this.epoch);
    }
}

export class PacketAnnotation{
    constructor(
        public sensingTime: Time,
        public downlinkTime: Time,
        public packetLength: number,
        public frames: number,
        public missingFrames: number,
        public crcFlag: number,
        public vcid: number,
        public channel: number,
        public spare: number
    ){}
}

const decodeAnnotations = async function(path: string){
    const buff = await fs.readFile(path);
    const packets: PacketAnnotation[] = [];
    let offset = 0;
    while(offset < buff.length){
        packets.push(new PacketAnnotation(
            // sensingTime
            new Time(buff[offset++], buff[offset++], buff[offset++], buff[offset++],
                     buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // downlinkTime
            new Time(buff[offset++], buff[offset++], buff[offset++], buff[offset++],
                     buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // packetLength
            toU16(buff[offset++],buff[offset++]),
            // frames
            toU16(buff[offset++],buff[offset++]),
            // missingFrames
            toU16(buff[offset++],buff[offset++]),
            // crcFlag
            buff[offset++],
            // vcid
            buff[offset++],
            // channel
            buff[offset++],
            // spare
            buff[offset++],
        ));
    }
    return packets;
}

export class PacketIndex{
    constructor(
        public dateAndTime: number,
        public deltaTime: number,
        public deltaSize: number,
        public dataUnitsOffset: number,
        public byteOffset: number,
        public variableSizeFlag: number,
        public spare: number
    ){}
}

const decodeIndices = async function(path: string){
    const buff = await fs.readFile(path);
    const packets: PacketIndex[] = [];
    let offset = 0;
    while(offset < buff.length){
        packets.push(new PacketIndex(
            // dateAndTime
            toDouble(buff[offset++], buff[offset++], buff[offset++], buff[offset++],
                     buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // deltaTime
            toDouble(buff[offset++], buff[offset++], buff[offset++], buff[offset++],
                     buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // deltaSize
            toU32(buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // dataUnitsOffset
            toU32(buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // byteOffset
            toU64(buff[offset++], buff[offset++], buff[offset++], buff[offset++],
                  buff[offset++], buff[offset++], buff[offset++], buff[offset++]),
            // variableSizeFlag
            buff[offset++],
            // spare
            toU32(0,buff[offset++], buff[offset++], buff[offset++]),
        ));
    }
    return packets;
}


class PrimaryHeader{
    static size = 6;
    constructor(
        public versionNumber: number,
        public id: number,
        public sequenceControl: number,
        public dataLength: number
    ){}
}

const decodePrimaryHeader = async function(buff: Buffer){
    return new PrimaryHeader(
        buff[0]>>>5,
        toU16(buff[0]&0b111, buff[1]),
        toU16(buff[2], buff[3]),
        toU16(buff[4], buff[5]),
    );
};

class SecondaryHeader{
    static size = 62;
    constructor(
        public coarseTime: number,
        public fineTime: number,
        public syncMarker: number,
        public dataTakeID: number,
        public ECCNumber: number,
        public firstSpareBit: number,
        public testMode: number,
        public RXChannelID: number,
        public instrumentConfigurationID: number,
        public dataWordIndex: number,
        public dataWord: number,
        public spacePacketCount: number,
        public priCount: number,
        public firstSpare3Bit: number,
        public BAQMode: number,
        public BAQBlockLength: number,
        public spareByte: number,
        public rangeDecimation: number,
        public RXGain: number,
        public TXRampRate: number,
        public TXPulseStartFrequency: number,
        public TXPulseLength: number,
        public secondSpare3Bit: number,
        public rank: number,
        public PRI: number,
        public SWST: number,
        public SWL: number,
        public ssbFlag: number,
        public polarisation: number,
        public temperatureCompensation: number,
        public firstSpare2Bit: number,
        public elevationBeamAddress: number,
        public secondSpare2Bit: number,
        public beamAddress: number,
        public calMode: number,
        public secondSpareBit: number,
        public TXPulseNumber: number,
        public signalType: number,
        public thirdSpare3Bit: number,
        public swap: number,
        public swathNumber: number,
        public numberOfQuads: number,
        public fillerOctet: number,
    ){}
}

const decodeSecondaryHeader = async function(b: Buffer){
    let i = 0;
    let N = 0;
    return new SecondaryHeader(
        toU32(b[i++], b[i++], b[i++], b[i++]),        // B4 coarseTime
        toU16(b[i++], b[i++]),                        // B2 fineTime
        toU32(b[i++], b[i++], b[i++], b[i++]),        // B4 syncMarker
        toU32(b[i++], b[i++], b[i++], b[i++]),        // B4 dataTakeID
        b[i++],                                       // B1 ECCNumber
        (N=b[i++],N>>>7)               &0b1,          // _1 firstSpareBit
        (N>>>4)                        &0b111,        // _3 testMode
        N                              &0b1111,       // _4 RXChannelID
        toU32(b[i++], b[i++], b[i++], b[i++]),        // B4 instrumentConfigurationID
        b[i++],                                       // B1 dataWordIndex
        toU16(b[i++], b[i++]),                        // B2 dataWord
        toU32(b[i++], b[i++], b[i++], b[i++]),        // B4 spacePacketCount
        toU32(b[i++], b[i++], b[i++], b[i++]),        // B4 priCount
        (N=b[i++],N>>>5)               &0b111,        // _3 firstSpare3Bit
        N                              &0b11111,      // _5 BAQMode
        b[i++],                                       // B1 BAQBlockLength
        b[i++],                                       // B1 spareByte
        b[i++],                                       // B1 rangeDecimation
        b[i++],                                       // B1 RXGain
        toU16(b[i++], b[i++]),                        // B2 TXRampRate
        toU16(b[i++], b[i++]),                        // B2 TXPulseStartFrequency
        toU32(0,      b[i++], b[i++], b[i++]),        // B3 TXPulseLength // acc. to the docs 3 bit, but 13 makes more sense as 256 < val < 255+2^13
        (N=b[i++],N>>>5)               &0b111,        // _3 secondSpare3Bit
        N                              &0b11111,      // _5 rank // acc. to the docs 3 bit, but 5 makes more sense
        toU32(0,      b[i++], b[i++], b[i++]),        // B3 PRI  // acc. to the docs 3 bytes, but 3 bits makes more sense
        toU32(0,      b[i++], b[i++], b[i++]),        // B3 SWST // acc... this part looks shady look again later
        toU32(0,      b[i++], b[i++], b[i++]),        // B3 SWL  // ... b3?
        (N=b[i++],N>>>7)               &0b1,          // _1 ssbFlag
        (N>>>4)                        &0b111,        // _3 polarisation
        (N>>>2)                        &0b11,         // _2 temperatureCompensation
        N                              &0b11,         // _2 firstSpare2Bit
        (N=toU16(b[i++],b[i++]),N>>>12)&0b1111,       // _4 elevationBeamAddress
        (N>>>10)                       &0b11,         // _2 secondSpare2Bit
        N                              &0b1111111111, // _10 beamAddress
        (N=b[i++],N>>>6)               &0b11,         // _2 calMode
        (N>>>5)                        &0b1,          // _1 secondSpareBit
        N                              &0b11111,      // _5 TXPulseNumber // b52???
        (N=b[i++],N>>>4)               &0b1111,       // _4 signalType
        (N>>>1)                        &0b111,        // _3 thirdSpare3Bit
        N                              &0b1,          // _1 swap
        b[i++],                                       // B1 swathNumber
        toU16(b[i++], b[i++]),                        // B2 numberOfQuads
        b[i++],                                       // B1 fillerOctet
    );
}

class Packet{
    totalSize: number;
    constructor(
        public primaryHeader: PrimaryHeader,
        public secondaryHeader: SecondaryHeader,
        public userData: Buffer
    ){
        this.totalSize = primaryHeader.dataLength+PrimaryHeader.size;
    }
}

export class SarProduct{
    annotations!: PacketAnnotation[];
    indices!: PacketIndex[];
    dataHandle!: FileHandle;
    dataPath: string;
    constructor(public path: string){
        this.dataPath = path+".dat";
    }
    async init(){
        const {path} = this;
        this.annotations = await decodeAnnotations(path+"-annot.dat");
        this.indices = await decodeIndices(path+"-index.dat");
        this.dataHandle = await fs.open(this.dataPath);
    }
    async readPacket(offset: number): Promise<Packet>{
        const {dataHandle: handle} = this;
        const s1 = PrimaryHeader.size;
        const s2 = SecondaryHeader.size;
        const buff = Buffer.allocUnsafe(s1+s2);
        await handle.read(buff,0,buff.length,offset);
        const primaryHeader = await decodePrimaryHeader(buff);
        const secondaryHeader = await decodeSecondaryHeader(buff.subarray(s1));

        offset += s1+s2;
        const userData = Buffer.allocUnsafe(primaryHeader.dataLength-s1);
        await handle.read(userData,0,userData.length,offset);

        return new Packet(
            primaryHeader,
            secondaryHeader,
            userData
        );
    }
    async readPacketAt(index: number){
        let offset = this.indices[index].byteOffset;
        return await this.readPacket(offset);
    }
    async readAll(){
        const fsize = (await fs.stat(this.dataPath)).size;
        let offset = 0;
        const packets: Packet[] = [];
        while(offset < fsize){
            const packet = await this.readPacket(offset);
            packets.push(packet);
            offset += packet.totalSize+1;// magic offset, need to investigate this further
        }
        return packets;
    }
}




const data = new SarProduct("/Users/ar-yutaro.yoshii/prog/sar/data/S1A_IW_RAW__0SDV_20231018T230619_20231018T230651_050826_062040_0E3E.SAFE/s1a-iw-raw-s-vh-20231018t230619-20231018t230651-050826-062040");
await data.init();

console.log(data.indices.length);
console.log(data.annotations.length);
console.log((await data.readAll()).length);
console.log(data.indices[0]);
console.log(await data.readPacketAt(0));
console.log(data.indices[10]);
console.log(await data.readPacketAt(10));
console.log(data.indices[50]);
console.log(await data.readPacketAt(50));









