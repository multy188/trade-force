import React, { Fragment } from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { EntityModel, newOrder, Order } from '@trade-force/models';
import { useUiState, useUiStateSetter } from '../../contexts';
import { useOrders } from '../../hooks';
import { ActionButton } from '../ActionButton';

const useStyles = makeStyles((theme: Theme) => ({
    button: {
        marginRight: theme.spacing(1) * 1.5,
    },
    buttonLast: {
        marginRight: theme.spacing(6),
    },
}));

export const NewOrderSection = () => {
    const classes = useStyles();
    const uiState = useUiState();
    const setUiState = useUiStateSetter();

    const {
        isLoading: isOrdersLoading,
        isError: isOrdersError,
        data: ordersModel,
        error: ordersError,
    } = useOrders();

    // Allow ErrorBoundary to handle errors
    if (isOrdersError) {
        throw ordersError;
    }

    if (isOrdersLoading) {
        return null;
    }

    if (ordersModel === undefined) {
        throw new Error('Error loading data');
    }

    const handleNewBuy = () => {
        const order = newOrder('buy');
        const orderModel = new EntityModel<Order>(order);
        setUiState({
            ...uiState,
            isOrderTicketOpen: true,
            targetOrder: orderModel,
        });
    };

    const handleNewSell = () => {
        const order = newOrder('sell');
        const orderModel = new EntityModel<Order>(order);
        setUiState({
            ...uiState,
            isOrderTicketOpen: true,
            targetOrder: orderModel,
        });
    };

    // Can't create orders if user doesn't have permissions
    if (ordersModel.getLink('create') === undefined) {
        return null;
    }

    return (
        <Fragment>
            <ActionButton
                className={classes.button}
                customAction="buy"
                onClick={handleNewBuy}
            >
                New Buy
            </ActionButton>
            <ActionButton
                className={classes.buttonLast}
                customAction="sell"
                onClick={handleNewSell}
            >
                New Sell
            </ActionButton>
        </Fragment>
    );
};
