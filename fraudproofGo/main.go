package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"
	"unsafe"

	// "github.com/asonnino/fraudproofs-prototype"
	// "String"
	"crypto/md5"
	"crypto/sha512"

	"github.com/NebulousLabs/merkletree"
	"github.com/musalbas/smt"
)

const tempSignature int = 1

type User struct {
	address string //地址
	wallet  int    //余额
	// prev    *User   //指向前一个用户
	state []State //表
}

type State struct {
	hash    string
	prev    *State
	value   int    //这次转账的金额，正为收入，负为支出
	address string //转账的地址
}

func NewUser() *User {
	rand.Seed(time.Now().UnixNano())
	randnum := rand.Intn(100000)
	address := string(IntToBytes(randnum))
	wallet := 0
	state := []State{}

	u := &User{
		address,
		wallet,
		// prev,
		state,
	}

	return u
}

func IntToBytes(n int) []byte {
	data := int64(n)
	bytebuf := bytes.NewBuffer([]byte{})
	binary.Write(bytebuf, binary.BigEndian, data)
	return bytebuf.Bytes()
}

type FraudProof struct {
	from                     string
	to                       string
	value                    int
	signature                int
	time                     string
	t                        []Transaction
	invalidTransactionsIndex int
}

type Transaction struct {
	from      string //发送者
	to        string //接收者
	value     int    //金额
	time      string //时间戳
	signature int    //发送者的签名,在这里我们统一为1为合法
}

func NewTransaction(from *User, to *User, value int, signature int) (*Transaction, error) {
	clock := time.Now().UnixNano()
	reversevalue := 0 - value
	to.ChangeUserState(value, from)
	from.ChangeUserState(reversevalue, to)
	t := &Transaction{
		from.address,
		to.address,
		value,
		string(clock),
		signature,
	}
	err := t.CheckTransaction()
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (u *User) ChangeUserState(value int, another *User) error {
	u.wallet = u.wallet + value
	var build strings.Builder
	var prev *State
	var s *State
	build.WriteString(string(value))
	build.WriteString(string(another.address))
	if len(u.state) > 0 {
		build.WriteString(string(u.state[len(u.state)-1].hash))
	}
	Md5Inst := md5.New()
	Md5Inst.Write([]byte(build.String()))
	hash := Md5Inst.Sum([]byte(""))
	if len(u.state) > 0 {
		prev = u.state[len(u.state)-1].prev
		s = &State{
			string(hash),
			prev,
			value,
			another.address,
		}
		fmt.Println(&prev)
	} else {
		s = &State{
			string(hash),
			nil,
			value,
			another.address,
		}
	}
	u.state = append(u.state, *s)
	// fmt.Println(u.state)
	return nil
}

func (t *Transaction) CheckTransaction() error {

	if t.signature != 1 {
		return errors.New("交易不合法")
	}

	return nil
}

func (t *Transaction) HashKey() [256]byte {
	var hashKey [256]byte
	h := sha512.New512_256()
	h.Write(t.Serialize())
	copy(hashKey[:], h.Sum(nil)[:])
	return hashKey
}

const MaxSize int = 2

type SliceMock struct {
	addr uintptr
	len  int
	cap  int
}

func (t *Transaction) Serialize() []byte {
	Len := unsafe.Sizeof(t)
	buffStruct := &SliceMock{
		uintptr(unsafe.Pointer(t)),
		int(Len),
		int(Len),
	}
	buff := *(*[]byte)(unsafe.Pointer(buffStruct))
	return buff
}

type Block struct {
	// data structure
	dataRoot     []byte        //表示块中包括的数据(例如，交易)的Merkle树的根
	stateRoot    []byte        //表示代表区块链状态(state of blockchain)的稀疏Merkle树的根
	transactions []Transaction //表示这个区块里包含的交易
	hash         []byte        //唯一标识

	// implementation specific
	prev            *Block           // 指向前一个区块
	dataTree        *merkletree.Tree // 数据 MerkleTree
	interStateRoots [][]byte         // 中间状态根 (saved every 'step' transactions)

}

func NewBlock(t []Transaction, prev *Block) (*Block, error) {
	for i := 0; i < len(t); i++ {
		err := t[i].CheckTransaction()
		if err != nil {
			return nil, err
		}
	}

	// interStateRoots, stateRoot, err := fillStateTree(t, stateTree)
	// if err != nil {
	// 	return nil, err
	// }

	dataTree := merkletree.New(sha512.New512_256())
	dataRoot, err := fillDataTree(t, dataTree)
	if err != nil {
		return nil, err
	}

	return &Block{
		dataRoot,
		nil,
		// stateRoot,
		t,
		nil,
		prev,
		dataTree,
		nil,
		/*interStateRoots*/}, nil
}

const Step int = 2

func fillStateTree(t []Transaction, stateTree *smt.SparseMerkleTree) ([][]byte, []byte, error) {
	var stateRoot []byte
	var interStateRoots [][]byte
	for i := 0; i < len(t); i++ {

		root, err := stateTree.Update([]byte(t[i].from), []byte(t[i].to))
		if err != nil {
			return nil, nil, err
		}

		stateRoot = make([]byte, len(root))
		copy(stateRoot, root)

		if i != 0 && i%Step == 0 {
			interStateRoots = append(interStateRoots, stateRoot)
		}
	}
	if len(t)%Step == 0 {
		interStateRoots = append(interStateRoots, stateRoot)
	}

	return interStateRoots, stateRoot, nil
}

func fillDataTree(t []Transaction, dataTree *merkletree.Tree) ([]byte, error) {
	for i := 0; i < len(t); i++ {
		Serializet := t[i].Serialize()
		dataTree.Push(Serializet)
	}
	return dataTree.Root(), nil
}

func (b *Block) CheckBlock(prev *Block, transactions []Transaction) (*FraudProof, error) {
	rebuiltBlock, err := NewBlock(transactions, prev)
	if err != nil {
		return nil, err
	}

	// tempDataTree := merkletree.New(sha512.New512_256())
	// tempDataRoot, err := fillDataTree(transactions, tempDataTree)

	for i := 0; i < len(transactions); i++ {
		fmt.Println(i)
		if len(b.transactions) <= i || b.transactions[i].from != transactions[i].from || b.transactions[i].to != transactions[i].to || b.transactions[i].value != transactions[i].value || b.transactions[i].signature != transactions[i].signature || b.transactions[i].time != transactions[i].time {
			fmt.Println(i)
			t := rebuiltBlock.transactions[i]
			var from string
			var to string
			var value int
			var signature int
			var time string

			from = t.from
			to = t.to
			value = t.value
			signature = t.signature
			time = t.time

			var invalidTransactionsIndex int

			invalidTransactionsIndex = i

			return &FraudProof{
				from,
				to,
				value,
				signature,
				time,
				b.transactions,
				invalidTransactionsIndex,
			}, nil
		}
	}
	return nil, nil
}

func (b *Block) VerifyFraudProof(fp FraudProof) bool {

	if fp.from != fp.t[fp.invalidTransactionsIndex].from || fp.to != fp.t[fp.invalidTransactionsIndex].to || fp.value != fp.t[fp.invalidTransactionsIndex].value || fp.time != fp.t[fp.invalidTransactionsIndex].time || fp.signature != fp.t[fp.invalidTransactionsIndex].signature {
		return true
	}

	return false
}

func main() {
	userA := &User{
		"foundation",
		100,
		[]State{},
	}
	userB := NewUser()

	s := "foundation"

	foundationB := &Block{
		nil,
		nil,
		nil,
		[]byte(s),
		nil,
		nil,
		nil,
	}

	tlist := []Transaction{}
	t1, _ := NewTransaction(userA, userB, 1, tempSignature)
	tlist = append(tlist, *t1)
	t2, _ := NewTransaction(userA, userB, 9, tempSignature)
	tlist = append(tlist, *t2)
	t3, _ := NewTransaction(userB, userA, 3, tempSignature)
	tlist = append(tlist, *t3)
	t4, _ := NewTransaction(userA, userB, 5, tempSignature)
	tlist = append(tlist, *t4)
	b, _ := NewBlock(tlist, foundationB)
	fp, err := b.CheckBlock(foundationB, tlist)
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println("when transactions are correct")
	if fp != nil {
		result := b.VerifyFraudProof(*fp)
		fmt.Println(result)
	} else {
		fmt.Println("--------------------")
		fmt.Println("All transactions OK!")
		fmt.Println("--------------------")
	}

	fmt.Print("\n")
	fmt.Print("\n")
	fmt.Println("when transactions are invalid")
	faketlist := []Transaction{}
	tfake, _ := NewTransaction(userA, userB, 2, tempSignature)
	faketlist = append(faketlist, *t1)
	faketlist = append(faketlist, *t2)
	faketlist = append(faketlist, *tfake)
	faketlist = append(faketlist, *t3)

	fp, err = b.CheckBlock(foundationB, faketlist)
	if err != nil {
		fmt.Println(err)
	}

	if fp != nil {
		result := b.VerifyFraudProof(*fp)
		fmt.Println("")
		fmt.Println(result)
		fmt.Println("验证成功，出错的是第 %d 笔交易", fp.invalidTransactionsIndex+1)
		fmt.Println("其交易信息分别为")
		fmt.Println(fp.from)
		fmt.Println(fp.to)
		fmt.Println(fp.value)
		fmt.Println(fp.time)
		fmt.Println(fp.signature)
		fmt.Println("****************************************")
		fmt.Println("%v", fp.t[fp.invalidTransactionsIndex])
	} else {
		fmt.Println("All transactions OK!")
	}

}
