import React, {useCallback, useMemo, useState} from 'react';
import {Input} from './Input/Input';
import './Form.scss';
import {
    BIG_ZERO,
    daiAddress,
    getBalanceNumber,
    getFullDisplayBalance,
    usdcAddress,
    usdtAddress
} from "../../utils/formatbalance";
import {useAllowanceStables} from "../../hooks/useAllowance";
import {useUserBalances} from "../../hooks/useUserBalances";
// import useLpPrice from "../../hooks/useLpPrice";
import useUserLpAmount from "../../hooks/useUserLpAmount";
import useApprove from "../../hooks/useApprove";
import useStake from "../../hooks/useStake";
import useUnstake from "../../hooks/useUnstake";
import {useWallet} from "use-wallet";
import {BigNumber} from "bignumber.js";
import {Modal,Button,Tooltip,OverlayTrigger} from "react-bootstrap";
import {NoWallet} from "../NoWallet/NoWallet"

interface FormProps {
    operationName: string;
}

const getValidationError = (
    dai: String,
    usdc: String,
    usdt: String,
    isApproved: Boolean,
    pendingTx: Boolean,
    depositExceedAmount: Boolean
) => {
    let error = '';

    if (dai === '' && usdc === '' && usdt === '') {
        error = 'Please, enter the amount of stablecoins to deposit';
    } else if (depositExceedAmount) {
        error = 'You\'re trying to deposit more than you have';
    } else if (!isApproved) {
        error = 'You have to approve your funds before the deposit';
    } else if (pendingTx) {
        error = 'You can\'t deposit because have a pending transaction';
    }

    return error;
}

export const Form = (props: FormProps): JSX.Element => {
    const [dai, setDai] = useState('');
    const [usdc, setUsdc] = useState('');
    const [usdt, setUsdt] = useState('');

    const daiInputHandler = (newValue: string) => {
        setDai(newValue);
    };

    const usdcInputHandler = (newValue: string) => {
        setUsdc(newValue);
    };

    const usdtInputHandler = (newValue: string) => {
        setUsdt(newValue);
    };

    const [pendingDAI, setPendingDAI] = useState(false);
    const [pendingUSDC, setPendingUSDC] = useState(false);
    const [pendingUSDT, setPendingUSDT] = useState(false);

    // const lpPrice = useLpPrice();

    // wrapped in useMemo to prevent lpShareToWithdraw hook deps change on every render
    const lpPrice = useMemo(() => new BigNumber(1), []);
    const userLpAmount = useUserLpAmount();
    const userBalanceList = useUserBalances();
    const approveList = useAllowanceStables();
    const stableInputsSum = parseFloat(dai) + parseFloat(usdc) + parseFloat(usdt);
    // user allowance
    const isApprovedTokens = [
        approveList ? approveList[0].toNumber() > 0 : false,
        approveList ? approveList[1].toNumber() > 0 : false,
        approveList ? approveList[2].toNumber() > 0 : false,
    ];
    const isApproved = approveList &&
        (((parseFloat(dai) > 0 && isApprovedTokens[0]) || dai === '0' || dai === '')
            && ((parseFloat(usdc) > 0 && isApprovedTokens[1]) || usdc === '0' || usdc === '')
            && ((parseFloat(usdt) > 0 && isApprovedTokens[2]) || usdt === '0' || usdt === ''));
    // max for withdraw or deposit
    const userMaxWithdraw = lpPrice.multipliedBy(userLpAmount) || BIG_ZERO;
    const userMaxWithdrawMinusInput = (!userMaxWithdraw || userMaxWithdraw.toNumber() <= 0 || !userMaxWithdraw.toNumber()) ? BIG_ZERO
        : new BigNumber(userMaxWithdraw.toNumber() - stableInputsSum);
    const userMaxDeposit = [
        (userBalanceList && userBalanceList[0].toNumber() > 0 && userBalanceList[0]) || BIG_ZERO,
        (userBalanceList && userBalanceList[1].toNumber() > 0 && userBalanceList[1]) || BIG_ZERO,
        (userBalanceList && userBalanceList[2].toNumber() > 0 && userBalanceList[2]) || BIG_ZERO
    ];
    const max = [
        props.operationName.toLowerCase() === 'deposit' ? userMaxDeposit[0] : userMaxWithdrawMinusInput,
        props.operationName.toLowerCase() === 'deposit' ? userMaxDeposit[1] : userMaxWithdrawMinusInput,
        props.operationName.toLowerCase() === 'deposit' ? userMaxDeposit[2] : userMaxWithdrawMinusInput,
    ];

    // approves
    const {onApprove} = useApprove();
    const handleApproveDai = useCallback(async () => {
        try {
            setPendingDAI(true);
            const tx = onApprove(daiAddress);
            if (!tx) {
                setPendingDAI(false);
            }
        } catch (e) {
            setPendingDAI(false);
        }
    }, [onApprove]);
    const handleApproveUsdc = useCallback(async () => {
        try {
            setPendingUSDC(true);
            const tx = onApprove(usdcAddress);
            if (!tx) {
                setPendingUSDC(false);
            }
        } catch (e) {
            setPendingUSDC(false);
        }
    }, [onApprove]);
    const handleApproveUsdt = useCallback(async () => {
        try {
            setPendingUSDT(true);
            const tx = onApprove(usdtAddress);
            if (!tx) {
                setPendingUSDT(false);
            }
        } catch (e) {
            setPendingUSDT(false);
        }
    }, [onApprove]);

    const fullBalanceLpShare = useMemo(() => {
        return getFullDisplayBalance(userLpAmount);
    }, [userLpAmount]);

    // caclulate lpshare to withdraw
    const lpShareToWithdraw = useMemo(() => {
        return new BigNumber(stableInputsSum / getBalanceNumber(lpPrice));
    }, [stableInputsSum, lpPrice]);

    const fullBalancetoWithdraw = useMemo(() => {
        return getFullDisplayBalance(lpShareToWithdraw);
    }, [lpShareToWithdraw]);

    // deposit and withdraw functions
    const depositExceedAmount = parseInt(dai) > getBalanceNumber(userBalanceList[0])
        || parseInt(usdc) > getBalanceNumber(userBalanceList[1], 6)
        || parseInt(usdt) > getBalanceNumber(userBalanceList[2], 6);
    const [pendingTx, setPendingTx] = useState(false);
    const [pendingWithdraw, setPendingWithdraw] = useState(false);
    const {onStake} = useStake(dai === '' ? '0' : dai, usdc === '' ? '0' : usdc, usdt === '' ? '0' : usdt);
    const {onUnstake} = useUnstake(fullBalancetoWithdraw, dai === '' ? '0' : dai, usdc === '' ? '0' : usdc, usdt === '' ? '0' : usdt);

    // user wallet
    const {account} = useWallet();

    // TODO: need detect canceled tx's by user

    const [showModal, setModalShow] = useState(false);
    const handleModalClose = () => setModalShow(false);
    const canDeposit = (dai === '' && usdc === '' && usdt === '') || !isApproved || pendingTx || depositExceedAmount;

    if (!account) {
        return (
            <NoWallet />
        );
    }

    const validationError = getValidationError(dai, usdc, usdt, isApproved, pendingTx, depositExceedAmount);

    return (
        <div className={'Form'}>
            <Modal
                show={showModal}
                onHide={handleModalClose}
                backdrop="static"
                keyboard={false}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Warning!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Please note. This is a beta version. The contract has not been auditied yet. Use it at your own risk.
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="primary" onClick={async () => {
                            setModalShow(false);
                            setPendingTx(true);
                            await onStake();
                            setPendingTx(false);
                        }}
                    >Understood</Button>
                </Modal.Footer>
            </Modal>
            <form>
                <Input name="DAI" value={dai} handler={daiInputHandler} max={max[0]}/>
                <Input name="USDC" value={usdc} handler={usdcInputHandler} max={max[1]}/>
                <Input name="USDT" value={usdt} handler={usdtInputHandler} max={max[2]}/>
                {
                    validationError &&
                        <span className={'mb-3 text-danger'}>{validationError}</span>
                }
                {props.operationName.toLowerCase() === 'deposit' &&
                <div>
                    {account && parseFloat(dai) > 0 && !isApprovedTokens[0] &&
                    <button disabled={pendingDAI || depositExceedAmount} onClick={handleApproveDai}>Approve DAI </button>
                    }
                    {account && parseFloat(usdc) > 0 && !isApprovedTokens[1] &&
                    <button disabled={pendingUSDC || depositExceedAmount} onClick={handleApproveUsdc}>Approve USDC </button>
                    }
                    {account && parseFloat(usdt) > 0 && !isApprovedTokens[2] &&
                    <button disabled={pendingUSDT || depositExceedAmount} onClick={handleApproveUsdt}>Approve USDT </button>
                    }
                    {account &&
                        <OverlayTrigger
                        placement={'right'}
                        overlay={
                            <Tooltip>Deposit temporarily disabled before next update</Tooltip>
                        }
                        >
                            <button
                                className={'disabled'}
                                onClick={(e) => e.preventDefault()}
                            >
                                Deposit
                            </button>
                        </OverlayTrigger>
                    }
                </div>
                }
                {props.operationName.toLowerCase() === 'withdraw' &&
                <div>
                    {account && <button
                        onClick={async () => {
                            setPendingWithdraw(true);
                            await onUnstake();
                            setPendingWithdraw(false);
                        }}
                        disabled={(dai === '' && usdc === '' && usdt === '') || pendingWithdraw
                        || fullBalanceLpShare === '0' || userMaxWithdraw.toNumber() < lpShareToWithdraw.toNumber()}
                    >
                        Withdraw
                    </button>}
                    {/*<input type='submit' value={'Withdraw all'} className={'Form__WithdrawAll'}/>*/}
                </div>
                }
            </form>
        </div>
    );
};
