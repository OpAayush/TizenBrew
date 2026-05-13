import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect } from 'react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function ItemBasic({ children, onClick, shouldFocus }) {
    const { ref, focused, focusSelf } = useFocusable();

    useEffect(() => {
        if (focused) {
            ref.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
            });
        }
    }, [focused, ref]);

    if (shouldFocus) {
        useEffect(() => {
            focusSelf();
        }, [ref]);
    }

    return (
        <div
            ref={ref}
            onClick={onClick}
            className={classNames(
                'relative bg-gray-900 shadow-2xl rounded-3xl p-8 ring-1 ring-gray-900/10 sm:p-10 h-[35vh] w-[20vw]',
                focused ? 'focus' : '',
            )}
        >
            {children}
        </div>
    );
}